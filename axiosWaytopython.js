import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// 配置常量
const CONFIG = {
  PAGE_SIZE: 20,
  CONCURRENT_REQUESTS: 2,
  DELAY_MS: 2000,
  MAX_RETRIES: 3,
  API_URL: 'https://api.youpin898.com/api/homepage/es/template/GetCsGoPagedList',
  HEADERS: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkNTA2NDg4MjkxMjY0MWU1OWYyZjY5NTBiNDgzODMzYyIsIm5hbWVpZCI6IjY4NDAxMTUiLCJJZCI6IjY4NDAxMTUiLCJ1bmlxdWVfbmFtZSI6IllQMDAwNjg0MDExNSIsIk5hbWUiOiJZUDAwMDY4NDAxMTUiLCJ2ZXJzaW9uIjoiWExUIiwibmJmIjoxNzMzNjUzMTU5LCJleHAiOjE3MzQ1MTcxNTksImlzcyI6InlvdXBpbjg5OC5jb20iLCJhdWQiOiJ1c2VyIn0._Vh-tMfvDavREnQYofvPm15-7ibAGidTBCzvagIhYdo',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.youpin898.com/',
    'Origin': 'https://www.youpin898.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  }
};

// 随机延迟函数
const randomDelay = (baseTime) => {
  const randomFactor = 0.5 + Math.random(); // 0.5-1.5之间的随机数
  return new Promise(resolve => setTimeout(resolve, baseTime * randomFactor));
};

// 获取单页数据（带重试机制）
async function fetchPage(pageIndex, retryCount = 0) {
  const requestData = {
    "gameId": "730",
    "listSortType": "2",
    "listType": "10",
    "pageIndex": pageIndex,
    "pageSize": CONFIG.PAGE_SIZE,
    "sortType": "0",
    "stickers": {},
    "stickersIsSort": false,
    "weapon": "weapon_ak47",
    "template": true
  };

  try {
    await randomDelay(CONFIG.DELAY_MS);
    
    const response = await axios.post(CONFIG.API_URL, requestData, {
      headers: {
        ...CONFIG.HEADERS,
        // 添加一些随机性来模拟真实浏览器行为
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });

    if (response.data.code === 84104) {
      console.warn(`查询功能暂不可用: ${response.data.msg}`);
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.log(`等待后重试第 ${pageIndex} 页，重试次数: ${retryCount + 1}`);
        await randomDelay(CONFIG.DELAY_MS * 4);
        return fetchPage(pageIndex, retryCount + 1);
      }
    }

    if (response.data.Code === -1) {
      console.warn(`系统繁忙: ${response.data.Msg}`);
      if (retryCount < CONFIG.MAX_RETRIES) {
        await randomDelay(CONFIG.DELAY_MS * 2);
        return fetchPage(pageIndex, retryCount + 1);
      }
    }

    return response.data;
  } catch (error) {
    console.error(`获取第 ${pageIndex} 页数据失败:`, error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`等待后重试第 ${pageIndex} 页，重试次数: ${retryCount + 1}`);
      await randomDelay(CONFIG.DELAY_MS * 5);
      return fetchPage(pageIndex, retryCount + 1);
    }
    return null;
  }
}

// 处理数据
function processData(data) {
  if (!data?.Data) return [];
  
  return data.Data.map((item) => ({
    type: item.Exterior,
    name: item.CommodityName,
    price: item.Price,
    onSaleCount: item.OnSaleCount,
    steamUSDPrice: item.SteamUSDPrice,
    iconUrl: item.IconUrl
  }));
}

// 并发获取数据
async function getAllDataParallel() {
  const allData = [];
  let pageIndex = 1;
  let hasMoreData = true;
  let consecutiveErrors = 0;

  while (hasMoreData && consecutiveErrors < 3) {
    const batch = Array.from(
      { length: CONFIG.CONCURRENT_REQUESTS }, 
      (_, i) => pageIndex + i
    );

    console.log(`正在处理第 ${batch[0]} - ${batch[batch.length - 1]} 页...`);

    const results = await Promise.all(
      batch.map(async (page) => {
        const data = await fetchPage(page);
        return data;
      })
    );

    let batchHasValidData = false;
    for (const data of results) {
      if (data?.Data) {
        batchHasValidData = true;
        const processedData = processData(data);
        allData.push(...processedData);

        if (data.Data.length < CONFIG.PAGE_SIZE) {
          hasMoreData = false;
          break;
        }
      }
    }

    if (!batchHasValidData) {
      consecutiveErrors++;
      console.warn(`连续失败次数: ${consecutiveErrors}`);
      await randomDelay(CONFIG.DELAY_MS * 5);
    } else {
      consecutiveErrors = 0;
    }

    pageIndex += CONFIG.CONCURRENT_REQUESTS;
  }

  return allData;
}

// 主程序
(async () => {
  try {
    console.log('开始获取数据...');
    
    const allData = await getAllDataParallel();
    
    // 保存数据到JSON文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `csgo_items_${timestamp}.json`;
    const filePath = path.join(process.cwd(), fileName);
    
    await fs.writeFile(filePath, JSON.stringify(allData, null, 2), 'utf8');
    console.log(`数据已保存到文件: ${fileName}`);
    console.log(`总共获取到 ${allData.length} 条数据`);

  } catch (error) {
    console.error('程序执行出错:', error);
  }
})();