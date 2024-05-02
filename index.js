const TelegramBot = require("node-telegram-bot-api")
const { get } = require("request")
require("dotenv").config()

const bot = new TelegramBot(process.env.TOKEN, { polling: true })

bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text
  if (text === "/start") {
    const welcomeMessage = `
    Добро пожаловать! 🍽️\n\nЯ бот, который поможет заказть еду с кафе Good Food. Вы можете выбрать блюда из нашего меню и сделать заказ. 😊\n\nДля просмотра меню и совершения заказа, воспользуйтесь кнопкой ниже:
    `
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Меню 🍔",
              web_app: {
                url: "https://main--inspiring-pika-5fe4bc.netlify.app",
              },
            },
          ],
        ],
        resize_keyboard: true,
      },
    })
  }

  if (msg?.web_app_data?.data) {
    try {
      const data = JSON.parse(msg?.web_app_data?.data)

      const messageTextToSend = getMessageText(data)

      await bot.sendMessage(chatId, messageTextToSend)
    } catch (e) {
      console.log(e)
      bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте еще раз")
      bot.sendMessage(process.env.MY_TG_ID, e)
    }
  }
})

function getCartText(cart) {
  let res = ""
  cart.forEach((el, index) => {
    res += `${index + 1}. ${el.name}(${el.price} ₽) x ${el.count}  - ${
      el.price * el.count
    } ₽\n`
  })

  return res
}

function getMessageText(data) {
  let cartText = getCartText(data.itemsInCart)

  return `Заказ:
  
${cartText}
Номер телефона: ${data.phone}
Адрес доставки: ${data.address}
Способ оплаты: ${data.payMethod === "cash" ? "Наличными" : "Переводом"}
Коментарий к заказу: ${data.comment}

Цена корзины: ${data.itemsPrice}
(С вами свяжутся для уточнения стоимости доставки)
  `
}
