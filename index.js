const { default: axios } = require("axios")
const TelegramBot = require("node-telegram-bot-api")
require("dotenv").config()

const groupId = Number(process.env.GROUP_ID)
const bot = new TelegramBot(process.env.TOKEN, { polling: true })
let isStockChange = false
let stockId = []

bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text
  if (text === "/start" && chatId !== groupId) {
    const welcomeMessage = `
    Добро пожаловать в мир вкусного мороженого! 🍦\n\nЯ бот, который поможет вам выбрать и заказать свежее мороженое от нашего лучшего ассортимента. Вы можете выбрать вкусы и размер порции, чтобы насладиться неповторимым вкусом лета. 😋\n\nДля просмотра нашего ассортимента и совершения заказа, просто воспользуйтесь кнопкой ниже. Давайте сделаем ваш день сладким и прохладным! 🍨
    `
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Мороженое 🍦",
              web_app: {
                url: "https://icecream.tg-delivery.ru/",
              },
            },
          ],
        ],
        resize_keyboard: true,
      },
    })
  }

  if (text === "/data" && chatId !== groupId) {
    bot.sendMessage(chatId, "Тутутуту", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Подтвердить", callback_data: "acceptButton" },
            { text: "Отменить", callback_data: "cancelButton" },
          ],
        ],
      },
    })
  }

  if (msg?.web_app_data?.data) {
    try {
      const data = JSON.parse(msg?.web_app_data?.data)

      const messageTextToSend = getMessageText(data)

      await bot.sendMessage(chatId, messageTextToSend, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Подтвердить", callback_data: "acceptButton" },
              { text: "Отменить", callback_data: "cancelButton" },
            ],
          ],
        },
      })
    } catch (e) {
      console.log(e)
      bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте еще раз")
      bot.sendMessage(process.env.MY_TG_ID, e)
    }
  }

  if (msg.reply_to_message && chatId === groupId) {
    if (!msg.reply_to_message.from.is_bot) {
      console.log("No")
      return
    }

    const replyedText = msg.reply_to_message.text
    const lastStroke = replyedText
      .split("\n")
      .find((el) => el.includes("CHAT ID:"))

    if (lastStroke === undefined) {
      console.log("No")
      return
    }

    const idToSend = lastStroke.split(":")[1].trim()

    await bot.sendMessage(idToSend, text)

    console.log(idToSend)
    console.dirxml(msg.reply_to_message)
  }

  if (isStockChange === true && chatId === groupId) {
    console.log(!stockId.includes(text))
    if (!stockId.includes(Number(text))) {
      bot.sendMessage(chatId, "Введены некоректные данные, попробуйте еще раз")
      isStockChange = false
      return
    }

    try {
      await axios
        .put("https://server.tg-delivery.ru/api/icecream/change-stock", {
          id: Number(text),
        })
        .then(() => {
          bot.sendMessage(chatId, "Данные были успешно изменены")
          isGoodsChange = false
          isModifiersChange = false
        })
    } catch (error) {
      bot.sendMessage(chatId, "Произошла какая-то ошибка")
    }

    isStockChange = false
  }

  if (text === "Админка" && chatId === groupId) {
    await bot.sendMessage(chatId, "Панель администратора", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Мороженное",
            },
          ],
        ],
        resize_keyboard: true,
      },
    })
  }

  if (text === "Мороженное" && chatId === groupId) {
    bot.deleteMessage(chatId, msg.message_id)
    axios
      .get("https://server.tg-delivery.ru/api/icecream/get-stock")
      .then((data) => {
        let text = ""
        data.data.forEach((el, index) => {
          text += `${el.id}. ${el.name} - ${el.stock}\n`
          stockId.push(el.id)
        })
        bot.sendMessage(chatId, text)
      })

    isStockChange = true
  }
})

bot.on("callback_query", async (query) => {
  let chatId = query.message.chat.id
  let messageId = query.message.message_id

  switch (query.data) {
    case "acceptButton":
      await bot.sendMessage(chatId, "Заказ был принят")
      await bot.sendMessage(
        process.env.GROUP_ID,
        query.message.text + `\n\nCHAT ID: ${chatId}`
      )

      bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: chatId,
          message_id: messageId,
        }
      )
      break
    case "cancelButton":
      bot.sendMessage(chatId, "Заказ был отклонен")

      bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: chatId,
          message_id: messageId,
        }
      )
      break
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
