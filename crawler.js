import {
  createCrawl
} from 'x-crawl'

// 创建爬虫应用
const crawlApp = createCrawl()

// crawlPage 用于爬取页面
crawlApp.crawlPage('https://www.youpin898.com/market/csgo?gameId=730&weapon=weapon_ak47').then(async (res) => {
  const {
    page,
    browser
  } = res.data
  await page.waitForSelector('.goods-list')
  const items = await page.evaluate(() => {
    // 选择器需要根据实际的HTML结构进行调整
    const elements = document.querySelectorAll('.goods-box'); // 替换为实际的CSS选择器
    const data = [];

    elements.forEach(element => {
      console.log(element);
    });

    return data; // 将数据返回到 Node.js 环境
  });

})