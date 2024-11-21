/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Модуль взаимодействия с CSV файлом учёта
 * ========================================
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 02.10.2024
 */

const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const path = require('path'); // Модуль для работы с путями файлов и директорий
const filePath = path.join(__dirname, '../../data/+positions.csv'); // Путь к файлу CSV
const logger = require('./logService'); // Подключаем модуль для логирования
const logFunctionName = require('./logFunctionName'); // Модуль для получения имени функции (для логирования)


// Загружаем все позиции из CSV файла
function loadPositions() {
    return new Promise((resolve, reject) => {
        const positions = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                positions.push({
                    ticker: row.ticker,
                    figi: row.figi,
                    quantity: parseFloat(row.quantity), // Преобразование количества в float
                    purchaseDate: row.purchaseDate,
                    purchasePrice: parseFloat(row.purchasePrice), // Преобразование цены покупки в float
                    updateDate: row.updateDate,
                    maxPrice: parseFloat(row.maxPrice), // Преобразование максимальной цены в float
                    profitLoss: parseFloat(row.profitLoss) // Преобразование прибыли/убытков в float
                });
            })
            .on('end', () => resolve(positions))
            .on('error', reject);
    });
}

// Сохраняем актуальные данные о позициях в CSV файл
function savePositions(positions) {
    const csvFields = ['ticker', 'figi', 'quantity', 'purchaseDate', 'purchasePrice', 'updateDate', 'maxPrice', 'profitLoss'];
    const csvData = parse(positions, { fields: csvFields });

    fs.writeFileSync(filePath, csvData);
}

// Удаляем позицию из CSV файла (после продажи)
function removePosition(figi) {
    loadPositions().then(positions => {
        const updatedPositions = positions.filter(position => position.figi !== figi);
        savePositions(updatedPositions);
    });
}

// Добавляем новую позицию или обновляем существующую в CSV файле
function updatePosition(newPosition) {
    loadPositions().then(positions => {
        const index = positions.findIndex(pos => pos.figi === newPosition.figi);

        if (index === -1) {
            // Добавляем, если не нашли существующую позицию
            positions.push(newPosition);
        } else {
            // Обновляем, если позиция уже существует
            positions[index] = newPosition;
        }

        savePositions(positions);
    });
}

module.exports = { loadPositions, updatePosition, removePosition };