document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const priceTypeSelect = document.getElementById('priceTypeSelect');
    const copyAllButton = document.getElementById('copyAllButton');

    const multiSearchInput = document.getElementById('multiSearchInput');
    const multiSearchButton = document.getElementById('multiSearchButton');
    const multiResetButton = document.getElementById('multiResetButton');
    const multiSearchWarning = document.getElementById('multiSearchWarning');
    const notFoundBox = document.getElementById('notFoundBox');

    const MAX_MULTI_TERMS = 10;

    let allProducts = [];
    let currentResults = [];

    // Function to fetch product data
    async function fetchProducts() {
        try {
            const response = await fetch('price_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allProducts = await response.json();
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-start">검색어를 입력하고 검색 버튼을 누르세요.</td></tr>`;
        } catch (error) {
            console.error('Error fetching product data:', error);
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">데이터를 불러오는 데 실패했습니다. (${error.message})</td></tr>`;
        }
    }

    // 현재 선택된 '복사할 가격' 필드명 반환
    function getSelectedPriceField() {
        return priceTypeSelect ? priceTypeSelect.value : '변경후 가격';
    }

    // 클립보드에 텍스트 복사
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            return false;
        }
    }

    // 버튼에 복사 성공/실패 피드백 표시
    function showCopyFeedback(button, success) {
        const original = button.textContent;
        button.textContent = success ? '복사됨!' : '실패';
        button.disabled = true;
        setTimeout(() => {
            button.textContent = original;
            button.disabled = false;
        }, 1200);
    }

    function hideNotFound() {
        notFoundBox.classList.add('d-none');
        notFoundBox.innerHTML = '';
    }

    function showNotFound(terms) {
        if (!terms || terms.length === 0) {
            hideNotFound();
            return;
        }
        notFoundBox.classList.remove('d-none');
        notFoundBox.innerHTML = `일치하는 항목이 없습니다: ${terms.join(', ')}`;
    }

    function hideMultiWarning() {
        multiSearchWarning.classList.add('d-none');
        multiSearchWarning.textContent = '';
    }

    function showMultiWarning(text) {
        multiSearchWarning.classList.remove('d-none');
        multiSearchWarning.textContent = text;
    }

    // Function to display products in the table
    function displayProducts(products) {
        currentResults = products;
        resultsTableBody.innerHTML = ''; // Clear previous results
        if (products.length === 0) {
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">검색 결과가 없습니다.</td></tr>`;
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="구분">${product['구분'] || ''}</td>
                <td data-label="규격">${product['규격'] || ''}</td>
                <td data-label="변경전 가격">${product['변경전 가격'] || ''}</td>
                <td data-label="변경후 가격">${product['변경후 가격'] || ''}</td>
                <td data-label="-5%" class="price-5">${product['-5%'] || ''}</td>
                <td data-label="-10%" class="price-10">${product['-10%'] || ''}</td>
                <td data-label="-15%" class="price-15">${product['-15%'] || ''}</td>
                <td data-label="복사"><button type="button" class="btn btn-sm btn-outline-primary copy-row-btn">복사</button></td>
            `;
            const copyBtn = row.querySelector('.copy-row-btn');
            copyBtn.addEventListener('click', async () => {
                const field = getSelectedPriceField();
                const price = product[field] || '';
                const text = `${product['규격'] || ''}\t${price}`;
                const ok = await copyText(text);
                showCopyFeedback(copyBtn, ok);
            });
            resultsTableBody.appendChild(row);
        });
    }

    // 단일 검색 (부분 일치, 대소문자 무시)
    function handleSearch() {
        hideNotFound();
        hideMultiWarning();
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">검색어를 입력해주세요.</td></tr>`;
            return;
        }
        const filteredProducts = allProducts.filter(product => {
            const specMatch = product['규격'] && product['규격'].toLowerCase().includes(searchTerm);
            return specMatch;
        });
        displayProducts(filteredProducts);
    }

    // 다중 검색 (정확히 일치, 대소문자 무시, 최대 10개)
    function handleMultiSearch() {
        hideNotFound();
        hideMultiWarning();

        const rawInput = multiSearchInput.value;
        let terms = rawInput
            .split(/[\n,]+/)
            .map(t => t.trim())
            .filter(Boolean);

        if (terms.length === 0) {
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">검색어를 입력해주세요.</td></tr>`;
            return;
        }

        if (terms.length > MAX_MULTI_TERMS) {
            showMultiWarning(`최대 ${MAX_MULTI_TERMS}개까지 검색 가능합니다. (입력하신 ${terms.length}개 중 앞의 ${MAX_MULTI_TERMS}개만 검색합니다.)`);
            terms = terms.slice(0, MAX_MULTI_TERMS);
        }

        const matched = [];
        const notFound = [];
        const seen = new Set();

        terms.forEach(term => {
            const termLower = term.toLowerCase();
            const found = allProducts.filter(p => p['규격'] && p['규격'].toLowerCase() === termLower);
            if (found.length === 0) {
                notFound.push(term);
            } else {
                found.forEach(product => {
                    const key = `${product['구분']}_${product['규격']}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        matched.push(product);
                    }
                });
            }
        });

        displayProducts(matched);
        showNotFound(notFound);
    }

    function handleMultiReset() {
        multiSearchInput.value = '';
        hideMultiWarning();
        hideNotFound();
        resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-start">검색어를 입력하고 검색 버튼을 누르세요.</td></tr>`;
    }

    // 검색 결과 전체를 '규격 [탭] 선택한 가격' 형태로 한번에 복사
    async function handleCopyAll() {
        if (currentResults.length === 0) return;
        const field = getSelectedPriceField();
        const lines = currentResults.map(p => `${p['규격'] || ''}\t${p[field] || ''}`);
        const ok = await copyText(lines.join('\n'));
        showCopyFeedback(copyAllButton, ok);
    }

    // Event Listeners
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    if (multiSearchButton) {
        multiSearchButton.addEventListener('click', handleMultiSearch);
    }
    if (multiResetButton) {
        multiResetButton.addEventListener('click', handleMultiReset);
    }

    if (copyAllButton) {
        copyAllButton.addEventListener('click', handleCopyAll);
    }

    // Initial fetch of products when the page loads
    fetchProducts();
});
