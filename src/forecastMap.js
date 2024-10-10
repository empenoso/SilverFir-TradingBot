/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Инструмент поиска рекомендаций аналитиков
 * =========================================
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 09.10.2024
 */

const secrets = require('../config/secrets'); // Ключи доступа и идентификаторы
const logger = require('./services/logService'); // Логирование в файл и консоль
const TinkoffClient = require('./grpc/tinkoffClient'); // Модуль для взаимодействия с API Tinkoff Invest

const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);

// Шаг 1: Извлечение данных об акциях
// Первая часть включает в себя извлечение данных об акциях из API, фильтрацию и регистрацию.
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Получаем акции
async function getStockData() {
    const testPayload = {
        instrumentStatus: "INSTRUMENT_STATUS_BASE",
        instrumentExchange: "INSTRUMENT_EXCHANGE_UNSPECIFIED"
    };

    const response = await tinkoffClient.callApi('InstrumentsService/Shares', testPayload);
    const stocks = response.instruments;

    // Фильтруем акции по realExchange = REAL_EXCHANGE_MOEX
    const filteredStocks = stocks.filter(stock => stock.realExchange === 'REAL_EXCHANGE_MOEX');
    logger.info(`Всего REAL_EXCHANGE_MOEX: ${filteredStocks.length}`);

    const filteredArray = filteredStocks.map(stock => ({
        figi: stock.figi,
        ticker: stock.ticker,
        uid: stock.uid,
        name: stock.name,
        countryOfRiskName: stock.countryOfRiskName,
        logoName: stock.brand.logoName.slice(0, -4)
    }));
    logger.info('\nОтфильтрованные REAL_EXCHANGE_MOEX (первые три записи):', filteredArray.slice(0, 3));

    const allStocksArray = stocks.map(stock => ({
        figi: stock.figi,
        ticker: stock.ticker,
        uid: stock.uid,
        name: stock.name,
        countryOfRiskName: stock.countryOfRiskName,
        logoName: stock.brand.logoName
    }));
    logger.info(`Всего акций в ответе: ${allStocksArray.length}`);
    logger.info('\nМассив всех доступных акций (первые три записи):', allStocksArray.slice(0, 3));

    return {
        filteredArray,
        allStocksArray
    };
}

// Выводим цену когда надо учесть что units и nano это целое и дробные части одного числа
function formatPrice(units, nano) {
    return parseFloat(`${units}.${nano}`)
}

// Шаг 2: Извлечение прогнозов инвестдомов
// Нам нужно выполнить итерацию, чтобы получить инвестиционные прогнозы.
async function getForecastsForStocks(stockArray) {
    const forecasts = [];
    let noRecommendationCount = 0; // Счетчик акций без рекомендаций
    const requestInterval = 600; // Интервал между запросами, чтобы не превышать 100 запросов в минуту (600 мс)

    for (const stock of stockArray) {

        try {
            const ForecastPayload = {
                instrumentId: stock.uid
            };

            // Логируем выполнение запроса
            logger.info(`Выполняем запрос ${JSON.stringify(ForecastPayload, null, 2)}`);

            // Выполняем запрос к API с ограничением по времени
            const forecastResponse = await tinkoffClient.callApi('InstrumentsService/GetForecastBy', ForecastPayload);

            // Логируем ответ API
            logger.info(`Ответ: ${JSON.stringify(forecastResponse, null, 2)}`);

            // Проверим, содержит ли ответ нужные данные
            if (forecastResponse && forecastResponse.targets && forecastResponse.targets.length > 0) {
                // Если есть рекомендации, заносим данные в массив прогнозов
                forecasts.push({
                    name: stock.name.replace("'", ""),
                    ticker: stock.ticker,
                    logo: `https://invest-brands.cdn-tinkoff.ru/${stock.logoName}x160.png`,
                    currentPrice: parseFloat(formatPrice(forecastResponse.targets[0].currentPrice.units, forecastResponse.targets[0].currentPrice.nano)),
                    consensus: parseFloat(formatPrice(forecastResponse.consensus.consensus.units, forecastResponse.consensus.consensus.nano)),
                    priceChange: parseFloat(formatPrice(forecastResponse.consensus.priceChangeRel.units, forecastResponse.consensus.priceChangeRel.nano)),
                    recommendationCount: forecastResponse.targets.length,
                    countryOfRiskName: stock.countryOfRiskName
                });

            } else {
                // Увеличить счетчик акций без рекомендаций
                logger.info(`У ${stock.name} (${stock.ticker}), ${stock.figi} [${stock.uid}] нет данных аналитиков.\n`);
                noRecommendationCount++;
            }
        } catch (error) {
            logger.error(`Ошибка при получении прогноза для ${stock.ticker}:`, error);
            noRecommendationCount++;
        }

        // Ожидаем перед следующим запросом, чтобы соблюдать лимит в 100 запросов в минуту
        await new Promise(resolve => setTimeout(resolve, requestInterval)); // Задержка 600 мс между запросами
    }

    // Cколько акций не имели рекомендаций
    logger.info(`Всего акций без рекомендаций: ${noRecommendationCount}`);

    // Сортируем массив прогнозов по изменению цены (priceChange) по убыванию
    forecasts.sort((a, b) => {
        // Сортировка по убыванию: сначала идет больший priceChange
        return b.priceChange - a.priceChange;
    });

    return forecasts;
}


// Шаг 3: Создадим сводную таблицу и сохраним ее как HTML
// Теперь, когда у нас есть данные по акциям и прогнозам, мы можем создать HTML-файл, содержащий сортируемую таблицу.

function generateHTMLTable(forecasts) {
    const html = `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { cursor: pointer; background-color: #f2f2f2; }
            tr:hover { background-color: #f5f5f5; }
            img { width: 50px; }
        </style>
        <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
        <script type="text/javascript">
            google.charts.load('current', {'packages':['table']});
            google.charts.setOnLoadCallback(drawTable);

            function drawTable() {
                var data = new google.visualization.DataTable();
                
                // Define the columns
                data.addColumn('string', 'Наименование');
                data.addColumn('string', 'Тикер');
                data.addColumn('string', 'Логотип');
                data.addColumn('number', 'Текущая цена');
                data.addColumn('number', 'Консенсусная цена');
                data.addColumn('number', 'Потенциал роста + падения, %');
                data.addColumn('number', 'Количество аналитиков');
                data.addColumn('string', 'Страна');

                // Add rows from forecasts data
                data.addRows([
                    ${forecasts.map(forecast => `[
                        '${forecast.name}', 
                        '${forecast.ticker}', 
                        '<img src="${forecast.logo}" alt="Logo">',
                        ${forecast.currentPrice}, 
                        ${forecast.consensus}, 
                        ${forecast.priceChange}, 
                        ${forecast.recommendationCount}, 
                        '${forecast.countryOfRiskName}'
                    ]`).join(",")}
                ]);

                var table = new google.visualization.Table(document.getElementById('forecastTable'));

                table.draw(data, {
                    allowHtml: true,
                    showRowNumber: true,
                    width: '100%',
                    height: 'auto'
                });
            }
        </script>
    </head>
    <body>
        <h2>Сводная таблица рекомендаций аналитиков из T‑Bank Invest API</h2>
        <div id="forecastTable"></div>
        <p>Выборка сгенерирована ${new Date().toLocaleString("ru-RU")}.<br><br>
        Составил <a href="https://shardin.name/" target="_blank">Михаил Шардин</a>.<br>
        <small>Подробнее про систему поиска недооцененных российских акций, используя T‑Bank Invest API + Node.JS <a href="https://habr.com/ru/articles/849556/" target="_blank">в статье на Хабре</a>.</small></p>
    </body>
    </html>
    `;

    // Save the HTML to a file
    fs.writeFileSync(path.join(__dirname, '../data/forecastTable.html'), html);
}


// Шаг 4: Собираем все вместе
// Вызываем эти функции последовательно

(async () => {
    const {
        filteredArray,
        allStocksArray
    } = await getStockData();

    const filteredForecasts = await getForecastsForStocks(filteredArray);

    generateHTMLTable(filteredForecasts);
})();