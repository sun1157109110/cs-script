import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import crypto from 'crypto';

const STEAM_API_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/';
const APP_ID = '730'; // CS:GO的应用ID
const BAIDU_TRANSLATE_APPID = '20240317001996115'
const BAIDU_TRANSLATE_KEY = 'oJfKnN9X6EyIS_F7vOcf'
const EMAIL_USER = '1157109110@qq.com'
const EMAIL_PASS = 'slddzoqlrzeghdad'
const RECEIVER_EMAIL = 'sun1157109110@163.com'
const BAIDU_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
// 初始化邮件发送器
const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS, // QQ邮箱的授权码
  },
});
async function sendEmail(subject, text) {
  const mailOptions = {
    from: EMAIL_USER,
    to: RECEIVER_EMAIL,
    subject: subject,
    text: text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
const translateText = async (text) => {
  const salt = Math.random().toString();
  const sign = crypto.createHash('md5').update(BAIDU_TRANSLATE_APPID + text + salt + BAIDU_TRANSLATE_KEY).digest('hex');
  try {
    const response = await fetch(`${BAIDU_TRANSLATE_API_URL}?q=${encodeURI(text)}&from=auto&to=zh&appid=${BAIDU_TRANSLATE_APPID}&salt=${salt}&sign=${sign}`);
    const data = await response.json();
    if (data.trans_result) {
      return data.trans_result[0].dst;
    }
  } catch (error) {
    console.error('Error translating text:', error);
  }
  return '';
};


async function getCSGOUpdateNews() {
  try {
    const response = await fetch(`${STEAM_API_URL}?appid=${APP_ID}&count=1&maxlength=300&format=json`);
    const data = await response.json();
    const newsItems = data.appnews.newsitems;
    if (newsItems.length > 0) {
      return newsItems[0];
    }
  } catch (error) {
    console.error('Error fetching CS:GO update news:', error);
  }
  return null;
}
let lastNewsGid = null;
const checkUpdates = async () => {

  try {
    const updateNews = await getCSGOUpdateNews();
    if (updateNews.gid !== lastNewsGid) {
      lastNewsGid = updateNews.gid;
      const translatedText = await translateText(updateNews.contents);
      await sendEmail('CS:GO 更新公告' + updateNews.title, translatedText)
      return translatedText
    }
  } catch (error) {
    console.log(error);
  }
};
// Schedule the task to run every 30 minutes
// Schedule the task to run every 10 minutes between 2am and 6am Shanghai time
cron.schedule('*/15 * * * *', () => {
  console.log('Checking for CS:GO updates...');
  checkUpdates();
}, );