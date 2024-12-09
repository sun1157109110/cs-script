import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

// 延迟函数，用于控制请求间隔
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

// 主程序
(async () => {
  try {
    // 初始化浏览器
    const browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口，便于调试
    });

    const page = await browser.newPage();
    
    // 设置浏览器视口大小
    await page.setViewport({
      width: 1280,
      height: 800
    });

    // 设置登录凭证
    const cookies = [{
      name: 'token',
      value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkNTA2NDg4MjkxMjY0MWU1OWYyZjY5NTBiNDgzODMzYyIsIm5hbWVpZCI6IjY4NDAxMTUiLCJJZCI6IjY4NDAxMTUiLCJ1bmlxdWVfbmFtZSI6IllQMDAwNjg0MDExNSIsIk5hbWUiOiJZUDAwMDY4NDAxMTUiLCJ2ZXJzaW9uIjoiWExUIiwibmJmIjoxNzMzNjUzMTU5LCJleHAiOjE3MzQ1MTcxNTksImlzcyI6InlvdXBpbjg5OC5jb20iLCJhdWQiOiJ1c2VyIn0._Vh-tMfvDavREnQYofvPm15-7ibAGidTBCzvagIhYdo',
      domain: '.youpin898.com'
    }];
    await page.setCookie(...cookies);

    // 设置请求拦截
    await page.setRequestInterception(true);
    page.on('request', request => {
      // 这里可以根据需要过滤或修改请求
      if (request.url().includes('GetCsGoPagedList')) {
        request.continue();
      } else {
        request.continue();
      }
    });

    // 存储所有爬取的数据
    let allData = [];

    // 监听网络响应
    page.on('response', async response => {
      if (response.url().includes('GetCsGoPagedList') && response.request().resourceType() === 'xhr') {
        try {
          const data = await response.json();
          const processedData = data.Data.map((item) => ({
            type: item.Exterior,          // 商品外观
            name: item.CommodityName,     // 商品名称
            price: item.Price,            // 当前价格
            onSaleCount: item.OnSaleCount,// 在售数量
            steamUSDPrice: item.SteamUSDPrice, // Steam美元价格
            iconUrl: item.IconUrl         // 商品图片URL
          }));
          allData = allData.concat(processedData);
          console.log(`已获取${allData.length}条数据`);
        } catch (error) {
          console.error('处理响应数据时出错:', error);
        }
      }
    });

    // 访问目标页面
    console.log('正在访问目标页面...');
    await page.goto('https://www.youpin898.com/market/csgo?gameId=730&weapon=weapon_ak47', {
      waitUntil: 'networkidle0'
    });

    // 递归函数：点击下一页并获取数据
    const clickNextPage = async () => {
      try {
        // 等待分页按钮出现
        await page.waitForSelector('.ant-pagination-next', {
          timeout: 5000
        });

        // 检查是否为最后一页
        const nextButtonDisabled = await page.evaluate(() => {
          const nextButton = document.querySelector('.ant-pagination-next');
          return nextButton ? nextButton.classList.contains('ant-pagination-disabled') : true;
        });

        if (nextButtonDisabled) {
          console.log('已到达最后一页');
          return;
        }

        // 延迟1秒后点击下一页
        await delay(1000);
        await page.click('.ant-pagination-next');
        console.log('正在获取下一页数据...');
        await clickNextPage(); // 递归获取下一页
      } catch (error) {
        console.error('翻页过程出错:', error);
      }
    };

    // 开始爬取数据
    await clickNextPage();

    // 保存数据到JSON文件
    const fileName = 'csgo_items.json';
    const filePath = path.join(process.cwd(), fileName);
    
    // 直接保存新数据
    await fs.writeFile(filePath, JSON.stringify(allData, null, 2), 'utf8');
    console.log(`数据已保存到文件: ${fileName}`);
    console.log(`总共获取到 ${allData.length} 条数据`);

    // 关闭浏览器
    await browser.close();

  } catch (error) {
    console.error('程序执行出错:', error);
  }
})();