document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");
    const resultsContainer = document.getElementById("results");
    const detailsContainer = document.getElementById("details-container");
    const backToResultsButton = document.getElementById("back-to-results");
    const scrollToTopButton = document.getElementById("scrollToTopButton");
    const searchContainer = document.getElementById("search-container");

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

    function cleanStringForSearch(str) {
        return str.toLowerCase().replace(/[-._ ]/g, '');
    }

    function searchInData(query) {
        if (!query) return [];

        const cleanQuery = cleanStringForSearch(query);

        // Сначала ищем совпадения по "Код обладнання" и "ЕМ"
        const emMatches = data.filter(item =>
            cleanStringForSearch(item["Код обладнання"] || '').includes(cleanQuery) ||
            item["ЕМ/КВПіА"].some(em =>
                cleanStringForSearch(em["ЕМ"] || '').includes(cleanQuery) ||
                cleanStringForSearch(em["Номер Автомата"] || '').includes(cleanQuery)
            )
        );

        // Если совпадения по "ЕМ" найдены, возвращаем только их
        if (emMatches.length > 0) {
            return emMatches;
        }

        // Если совпадений по "ЕМ" нет, ищем только по датчикам
        const sensorMatches = data.filter(item =>
            item["ЕМ/КВПіА"].some(em =>
                em["КВПіА"].some(kvp =>
                    cleanStringForSearch(kvp["Назва датчика"] || '').includes(cleanQuery) ||
                    cleanStringForSearch(kvp["Номер сигналу"] || '').includes(cleanQuery)
                )
            )
        );

        // Возвращаем только совпадения по датчикам
        return sensorMatches;
    }

    function displayResults(results, query) {
        resultsContainer.innerHTML = "";

        if (results.length === 0) {
            resultsContainer.innerHTML = "<p>Нічого не знайдено</p>";
            return;
        }

        const cleanQuery = cleanStringForSearch(query);

        const containsEMMatches = results.some(item =>
            cleanStringForSearch(item["Код обладнання"] || '').includes(cleanQuery) ||
            item["ЕМ/КВПіА"].some(em =>
                cleanStringForSearch(em["ЕМ"] || '').includes(cleanQuery) ||
                cleanStringForSearch(em["Номер Автомата"] || '').includes(cleanQuery)
            )
        );

        results.forEach((item, index) => {
            const resultItem = document.createElement("div");
            resultItem.classList.add("result-item");
            resultItem.dataset.index = index;

            if (containsEMMatches) {
                const highlightedCode = highlightMatch(item["Код обладнання"], query);
                let resultHTML = `
                    <div class="result-title">${highlightedCode}</div>
                    <div>Лінія: ${item["Лінія"]}</div>
                    ${item["ЕМ/КВПіА"].map(em => {
                        const highlightedEM = highlightMatch(em["ЕМ"], query);
                        const highlightedAutomata = highlightMatch(em["Номер Автомата"] || '', query);
    
                        return `
                            <div class="em-item">
                                ЕМ: ${highlightedEM}
                                <span class="em-detail">(Номер шафи: ${em["Номер шафи EM"] || '-'})</span>
                                ${highlightedAutomata ? `<br><span class="highlighted-automata">Номер автомата: ${highlightedAutomata}</span>` : ''}
                            </div>
                        `;
                    }).join('')}
                `;
                resultItem.innerHTML = resultHTML;
            } else {
                const sensorsHTML = item["ЕМ/КВПіА"]
                    .flatMap(em => em["КВПіА"]
                        .map(kvp => {
                            const highlightedSensorName = highlightMatch(kvp["Назва датчика"], query);
                            const highlightedSignalNumber = highlightMatch(kvp["Номер сигналу"], query);

                            return `
                                <div class="sensor-item">
                                    <strong>Датчик:</strong> ${highlightedSensorName} 
                                    <span class="kvpia-detail">(Номер шафи КВПіА: ${kvp["Номер шафи КВПіА"] || '-'})</span>
                                    <span class="kvpia-detail">(Сигнал: ${highlightedSignalNumber || '-'})</span>
                                `;
                        })
                    )
                    .join('');
                resultItem.innerHTML = `
                    <div class="result-title">${highlightMatch(item["Код обладнання"], query)}</div>
                    <div>Лінія: ${item["Лінія"]}</div>
                    ${sensorsHTML}
                `;
            }

            resultItem.addEventListener("click", () => showDetails(item, query));
            resultsContainer.appendChild(resultItem);
        });
    }

    function highlightMatch(text, query) {
        if (!text || !query) return text;

        const cleanQuery = cleanStringForSearch(query);
        const cleanText = cleanStringForSearch(text);

        let result = '';
        let lastIndex = 0;

        for (let i = 0; i < cleanText.length; i++) {
            if (cleanText.substring(i, i + cleanQuery.length) === cleanQuery) {
                result += text.substring(lastIndex, i) + '<span class="highlight">' + text.substring(i, i + cleanQuery.length) + '</span>';
                i += cleanQuery.length - 1;
                lastIndex = i + 1;
            }
        }

        return result + text.substring(lastIndex);
    }


    function showDetails(item, query) {
        previousScrollPosition = window.scrollY;

        resultsContainer.classList.add("hidden");
        detailsContainer.classList.remove("hidden");
        detailsContainer.classList.add("details-section");
        searchContainer.classList.add("hidden");

        let detailsHtml = `<h3 class="details-heading">Деталі для ${item["Код обладнання"]}</h3>`;
        detailsHtml += `<div class="detail-item"><span class="detail-label">Цех:</span><span class="detail-value">${item["Цех"]}</span></div>`;
        detailsHtml += `<div class="detail-item"><span class="detail-label">Лінія:</span><span class="detail-value">${item["Лінія"]}</span></div>`;
        detailsHtml += `<div class="detail-item"><span class="detail-label">Назва обладнання:</span><span class="detail-value">${item["Назва обладнання (українською)"]}</span></div>`;

        let scrollTo = null;
        let hasEm = false;
        let hasKvpia = false;

        item["ЕМ/КВПіА"].forEach((em, index) => {
            // Проверка наличия ЕМ
            if (em["ЕМ"]) {
                hasEm = true;
                const emId = `em-details-${index}`;
                let emHighlightClass = '';
                detailsHtml += `
                    <div style="margin-top: 20px;">
                        <h4 class="${emHighlightClass}" style="color: darkred;">
                            • ЕМ: ${highlightMatch(em["ЕМ"], query)}
                            <button class="toggle-details" data-target="${emId}">Деталі</button>
                        </h4>
                        <div id="${emId}" class="hidden">
                            <div><strong>Потужність Квт:</strong> ${em["Потужність Квт"] || '-'}</div>
                            <div><strong>Сила струму:</strong> ${em["Сила струму"] || '-'}</div>
                            <div><strong>Номер Автомата:</strong> ${highlightMatch(em["Номер Автомата"] || '', query)}</div>
                            <div><strong>Пристрій пуску:</strong> ${em["Пристрій пуску"] || '-'}</div>
                            <div><strong>Номер шафи EM:</strong> ${em["Номер шафи EM"] || '-'}</div>
                            <div><strong>Відмітка EM:</strong> ${em["Відмітка EM"] || '-'}</div>
                            <div><strong>Квадрат ЕМ:</strong> ${em["Квадрат ЕМ"] || '-'}</div>
                            <div><strong>Посилання ЕМ:</strong> ${em["Посилання ЕМ"] || '-'}</div>
                            <div><strong>Підшипники:</strong></div>
                            <ul>
                                ${Object.entries(em["Підшипники"]).map(([key, value]) => `
                                    <li><strong>${key}:</strong> ${value}</li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            }

            // Проверка наличия КВПіА
            if (em["КВПіА"] && em["КВПіА"].length > 0) {
                hasKvpia = true;
                const kvpiaId = `kvpia-details-${index}`;
                detailsHtml += `
                    <div style="margin-top: 20px;">
                        <h4 style="color: darkblue;"> 
                            > КВПіА: 
                            <button class="toggle-details" data-target="${kvpiaId}">Деталі</button>
                        </h4>
                        <div id="${kvpiaId}" class="hidden">
                `;

                em["КВПіА"].forEach((kvp, kvpIndex) => {
                    const sensorId = `sensor-${index}-${kvpIndex}`;
                    detailsHtml += `
                        <div id="${sensorId}" style="margin-bottom: 10px;">
                            <div><strong>Назва датчика:</strong> ${highlightMatch(kvp["Назва датчика"], query)}</div>
                            <div><strong>Номер сигналу:</strong> ${highlightMatch(kvp["Номер сигналу"] || '', query)}</div>
                            <div><strong>Модель датчика:</strong> ${kvp["Модель датчика"] || '-'}</div>
                            <div><strong>Номер шафи КВПіА:</strong> ${kvp["Номер шафи КВПіА"] || '-'}</div>
                            <div><strong>Відмітка КВПіА:</strong> ${kvp["Відмітка КВПіА"] || '-'}</div>
                            <div><strong>Квадрат КВПіА:</strong> ${kvp["Квадрат КВПіА"] || '-'}</div>
                            <div><strong>Посилання КВПіА:</strong> ${kvp["Посилання КВПіА"] || '-'}</div>
                        </div>
                    `;
                    if (cleanStringForSearch(kvp["Назва датчика"]).includes(cleanStringForSearch(query))) {
                        scrollTo = document.getElementById(sensorId);
                    }
                });

                detailsHtml += '</div></div>';
            }
        });

        // Если нет ни ЕМ, ни КВПіА
        if (!hasEm && !hasKvpia) {
            detailsHtml += "<div>Нет деталей по ЕМ или датчикам КВПіА.</div>";
        }

        detailsContainer.innerHTML = detailsHtml;
        addToggleDetailsListeners();
        backToResultsButton.classList.remove("hidden");

        // Прокрутка к соответствующему элементу, если он найден
        if (scrollTo) {
            setTimeout(() => {
                scrollTo.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
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
        searchContainer.classList.remove("hidden");
        backToResultsButton.classList.add("hidden");
        window.scrollTo(0, previousScrollPosition);
    });
});