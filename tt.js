import puppeteer from 'puppeteer';
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  }); // headless: false 会打开浏览器窗口，便于调试

  const page = await browser.newPage();
  // 设置视口大小
  await page.setViewport({
    width: 1280,
    height: 800
  });
  const cookies = [{
    name: 'token',
    value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzYzM1NWJkNTA2YTg0MTM0ODcxYmZjNzM1N2Q3ZmM3MyIsIm5hbWVpZCI6IjMwNDcwOTkiLCJJZCI6IjMwNDcwOTkiLCJ1bmlxdWVfbmFtZSI6IllQMDAwMzA0NzA5OSIsIk5hbWUiOiJZUDAwMDMwNDcwOTkiLCJ2ZXJzaW9uIjoiZDAxIiwibmJmIjoxNzE5MzEzNDMwLCJleHAiOjE3MjAxNzc0MzAsImlzcyI6InlvdXBpbjg5OC5jb20iLCJhdWQiOiJ1c2VyIn0.cXOX-v8BTxbR2CcACG8I1NJ6HOgxIYeZsgh0yS8phfk',
    domain: '.youpin898.com'
  }];
  await page.setCookie(...cookies);
  // 拦截网络请求
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('GetCsGoPagedList')) { // 替换为实际的API端点
      request.continue();
    } else {
      request.continue();
    }
  });

  // 捕获网络响应
  let res = [];
  page.on('response', async response => {
    if (response.url().includes('GetCsGoPagedList') && response.request().resourceType() === 'xhr') { // 替换为实际的API端点
      const data = await response.json();
      const arr = data.Data.map((i) => ({
        type: i.Exterior,
        name: i.CommodityName,
        price: i.Price,
        onSaleCount: i.OnSaleCount,
        steamUSDPrice: i.SteamUSDPrice,
        iconUrl: i.IconUrl
      }));
      res.push(arr);
    }
  });

  await page.goto('https://www.youpin898.com/market/csgo?gameId=730&weapon=weapon_ak47', {
    waitUntil: 'networkidle0'
  }); // 替换为你要爬取的实际网址

  // 递归函数点击分页按钮并获取数据
  const clickNextPage = async () => {
    try {
      await page.waitForSelector('.ant-pagination-next', {
        timeout: 5000
      });
      const nextButtonDisabled = await page.evaluate(() => {
        const nextButton = document.querySelector('.ant-pagination-next');
        return nextButton ? nextButton.classList.contains('ant-pagination-disabled') : true;
      });

      if (nextButtonDisabled) {
        console.log('已经是最后一页了');
        return;
      }
      // 等待 'GetCsGoPagedList' 请求完成
      await delay(1000)
      await page.click('.ant-pagination-next');
      await clickNextPage(); // 递归调用
    } catch (error) {
      console.error('分页点击出错:', error);
    }
  };
  await clickNextPage();

  console.log('所有数据:',  res.length);
  // await browser.close();
})();