document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");
    const resultsContainer = document.getElementById("results");
    const detailsContainer = document.getElementById("details-container");
    const backToResultsButton = document.getElementById("back-to-results");
    const scrollToTopButton = document.getElementById("scrollToTopButton");

    let data = [];
    let previousScrollPosition = 0;

    fetch('./data/data.json')
        .then(response => response.json())
        .then(json => { data = json; })
        .catch(error => console.error("Ошибка загрузки JSON:", error));

    searchInput.addEventListener("input", () => {
        const query = cleanStringForSearch(searchInput.value.trim());
        const results = searchInData(query);
        displayResults(results, query);
    });

    // Функция для очистки строки от специальных символов для поиска
    function cleanStringForSearch(str) {
        return str.toLowerCase().replace(/[-._ ]/g, '');
    }

    function searchInData(query) {
        if (!query) return [];

        return data.filter(item => {
            const matchesCode = cleanStringForSearch(item["Код обладнання"] || '').includes(query);
            const matchesEM = item["ЕМ/КВПіА"].some(em =>
                cleanStringForSearch(em["ЕМ"] || '').includes(query) ||
                cleanStringForSearch(em["Номер Автомата"] || '').includes(query)
            );
            const matchesSensor = item["ЕМ/КВПіА"].some(em =>
                em["КВПіА"].some(kvp =>
                    cleanStringForSearch(kvp["Назва датчика"] || '').includes(query) ||
                    cleanStringForSearch(kvp["Номер сигналу"] || '').includes(query)
                )
            );
            return matchesCode || matchesEM || matchesSensor;
        });
    }

    function displayResults(results, query) {
        resultsContainer.innerHTML = "";

        if (results.length === 0) {
            resultsContainer.innerHTML = "<p>Нічого не знайдено</p>";
            return;
        }

        results.forEach((item, index) => {
            const resultItem = document.createElement("div");
            resultItem.classList.add("result-item");
            resultItem.dataset.index = index;

            const highlightedCode = highlightMatch(item["Код обладнання"], query);
            let resultHTML = `
                <div class="result-title">${highlightedCode}</div>
                <div>Лінія: ${item["Лінія"]}</div>
                ${item["ЕМ/КВПіА"].map(em => {
                    const highlightedEM = highlightMatch(em["ЕМ"], query);
                    const highlightedAutomata = highlightMatch(em["Номер Автомата"] || '', query);
                    
                    // Проверяем датчики для каждого ЕМ с учетом полного совпадения
                    const highlightedSensors = em["КВПіА"].map(kvp => {
                        const cleanSensorName = cleanStringForSearch(kvp["Назва датчика"] || '');
                        const cleanSignalNumber = cleanStringForSearch(kvp["Номер сигналу"] || '');
                        const cleanQuery = cleanStringForSearch(query);
    
                        if (cleanSensorName === cleanQuery || cleanSignalNumber === cleanQuery) {
                            // Подсвечиваем датчик только при полном совпадении
                            return `<div class="sensor-item"><strong>Датчик:</strong> ${highlightMatch(kvp["Назва датчика"], query)} (Сигнал: ${highlightMatch(kvp["Номер сигналу"], query)})</div>`;
                        }
                        return '';
                    }).filter(Boolean).join('');
                    
                    return `
                        <div class="em-item">
                            ЕМ: ${highlightedEM}
                            <span class="em-detail">(Номер шафи: ${em["Номер шафи EM"] || '-'})</span>
                            ${highlightedAutomata ? `<br><span class="highlighted-automata">Номер автомата: ${highlightedAutomata}</span>` : ''}
                            ${highlightedSensors}
                        </div>
                    `;
                }).join('')}
            `;

            resultItem.innerHTML = resultHTML;
            resultItem.addEventListener("click", () => showDetails(item, query));
            resultsContainer.appendChild(resultItem);
        });
    }

    // Функция для выделения совпадений в тексте с учетом исключений
    function highlightMatch(text, query) {
        if (!text || !query) return text || '';

        // Очищаем запрос для поиска, игнорируя пробелы, тире, точки и подчеркивания
        const cleanQuery = cleanStringForSearch(query);

        // Прямой поиск, учитывая, что текст не изменяется, а запрос очищается
        const regex = new RegExp(cleanQuery.split('').join('[^a-z0-9]*'), 'gi');

        // Возвращаем текст с подсвеченными совпадениями
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    }

    function showDetails(item, query) {
        previousScrollPosition = window.scrollY;

        resultsContainer.classList.add("hidden");
        detailsContainer.classList.remove("hidden");

        let detailsHtml = `<h3 class="details-heading">Деталі для ${item["Код обладнання"]}</h3>`;
        detailsHtml += `<div><strong>Цех:</strong> ${item["Цех"]}</div>`;
        detailsHtml += `<div><strong>Лінія:</strong> ${item["Лінія"]}</div>`;
        detailsHtml += `<div><strong>Назва обладнання:</strong> ${item["Назва обладнання (українською)"]}</div>`;

        let foundSensor = false;
        let sensorOffset = 0;
        let highlightedEmId = null; // ID ЕМ, содержащего подсвеченный датчик

        item["ЕМ/КВПіА"].forEach((em, index) => {
            const emId = `em-details-${index}`;
            const isEmHighlighted = cleanStringForSearch(em["ЕМ"] || '').includes(cleanStringForSearch(query));

            let emContent = `
                <div style="margin-top: 20px;">
                    <h4 class="${isEmHighlighted ? 'highlight-section' : ''}">
                        ЕМ: ${highlightMatch(em["ЕМ"], query)}
                        <button class="toggle-details" data-target="${emId}">Деталі</button>
                    </h4>
                    <div id="${emId}" class="hidden"> <!-- Всегда скрыты по умолчанию -->
                        <div><strong>Потужність Квт:</strong> ${em["Потужність Квт"]}</div>
                        <div><strong>Сила струму:</strong> ${em["Сила струму"]}</div>
                        <div><strong>Номер Автомата:</strong> ${highlightMatch(em["Номер Автомата"], query)}</div>
                        <div><strong>Пристрій пуску:</strong> ${em["Пристрій пуску"]}</div>
                        <div><strong>Номер шафи EM:</strong> ${em["Номер шафи EM"]}</div>
                        <div><strong>Відмітка EM:</strong> ${em["Відмітка EM"]}</div>
                        <div><strong>Квадрат ЕМ:</strong> ${em["Квадрат ЕМ"]}</div>
                        <div><strong>Посилання ЕМ:</strong> ${em["Посилання ЕМ"]}</div>
                        <div><strong>КВПіА:</strong></div>
                        <ul>
                            ${em["КВПіА"].map((kvp, kvpIndex) => {
                                const cleanSensorName = cleanStringForSearch(kvp["Назва датчика"] || '');
                                const cleanSignalNumber = cleanStringForSearch(kvp["Номер сигналу"] || '');
                                const cleanQuery = cleanStringForSearch(query);
                                const isSensorHighlighted = cleanSensorName.includes(cleanQuery) || cleanSignalNumber.includes(cleanQuery);
    
                                if (isSensorHighlighted && !foundSensor) {
                                    foundSensor = true;
                                    highlightedEmId = emId; // Сохраняем ID ЕМ, содержащего подсвеченный датчик
                                    sensorOffset = index; // Индекс ЕМ, содержащего датчик
                                }
    
                                return `
                                    <li class="${isSensorHighlighted ? 'highlight-section' : ''}" id="sensor-${index}-${kvpIndex}" style="margin-bottom: 10px;">
                                        <div><strong>Назва датчика:</strong> ${highlightMatch(kvp["Назва датчика"], query)}</div>
                                        <div><strong>Номер сигналу:</strong> ${highlightMatch(kvp["Номер сигналу"], query)}</div>
                                        <div><strong>Модель датчика:</strong> ${kvp["Модель датчика"]}</div>
                                        <div><strong>Номер шафи КВПіА:</strong> ${kvp["Номер шафи КВПіА"]}</div>
                                        <div><strong>Відмітка КВПіА:</strong> ${kvp["Відмітка КВПіА"]}</div>
                                        <div><strong>Квадрат КВПіА:</strong> ${kvp["Квадрат КВПіА"]}</div>
                                        <div><strong>Посилання КВПіА:</strong> ${kvp["Посилання КВПіА"]}</div>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                        <div><strong>Підшипники:</strong></div>
                        <ul>
                            ${Object.entries(em["Підшипники"]).map(([key, value]) => `
                                <li><strong>${key}:</strong> ${value}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;

            detailsHtml += emContent;
        });

        detailsContainer.innerHTML = detailsHtml;
        addToggleDetailsListeners();
        backToResultsButton.classList.remove("hidden");

        // Раскрываем и скроллим к нужному ЕМ и датчику
        if (foundSensor) {
            setTimeout(() => {
                const emElement = document.getElementById(highlightedEmId);
                if (emElement) {
                    emElement.classList.remove('hidden'); // Раскрываем ЕМ
                    const sensorElement = document.getElementById(`sensor-${sensorOffset}-0`); // Предполагаем, что датчики идут по порядку
                    if (sensorElement) {
                        sensorElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
            }, 100); // Задержка для рендеринга DOM
        }
    }

    window.addEventListener("scroll", () => {
        scrollToTopButton.style.display = window.scrollY > 300 ? "block" : "none";
    });

    scrollToTopButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    function addToggleDetailsListeners() {
        document.querySelectorAll(".toggle-details").forEach(button => {
            button.addEventListener("click", () => {
                const target = document.getElementById(button.dataset.target);
                if (target) {
                    target.classList.toggle("hidden");
                }
            });
        });
    }

    backToResultsButton.addEventListener("click", () => {
        detailsContainer.classList.add("hidden");
        resultsContainer.classList.remove("hidden");
        backToResultsButton.classList.add("hidden");
        window.scrollTo(0, previousScrollPosition);
    });
});