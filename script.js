document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const priceTypeSelect = document.getElementById('priceTypeSelect');
    const copyAllButton = document.getElementById('copyAllButton');
    const copyKakaoTextButton = document.getElementById('copyKakaoTextButton');
    const copyKakaoImageButton = document.getElementById('copyKakaoImageButton');

    const multiSearchInput = document.getElementById('multiSearchInput');
    const multiSearchButton = document.getElementById('multiSearchButton');
    const multiResetButton = document.getElementById('multiResetButton');
    const multiSearchWarning = document.getElementById('multiSearchWarning');
    const notFoundBox = document.getElementById('notFoundBox');

    const MAX_MULTI_TERMS = 10;

    let allProducts = [];
    let currentResults = [];

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

    function getSelectedPriceField() {
        return priceTypeSelect ? priceTypeSelect.value : '변경후 가격';
    }

    // 가격 값 조회 (변경후 가격이 없으면 가격 필드로 대체 — 구 데이터 호환)
    function resolvePrice(product, field) {
        if (!product) return '';
        const val = product[field];
        if (val !== undefined && val !== null && val !== '') return val;
        if (field === '변경후 가격' && product['가격'] !== undefined && product['가격'] !== null && product['가격'] !== '') {
            return product['가격'];
        }
        return '';
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                return true;
            } catch (e2) {
                return false;
            }
        }
    }

    async function copyImageBlob(blob) {
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return true;
            }
            return false;
        } catch (err) {
            console.error('이미지 클립보드 복사 실패:', err);
            return false;
        }
    }

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

    function displayProducts(products) {
        currentResults = products;
        resultsTableBody.innerHTML = '';
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
                <td data-label="변경후 가격">${resolvePrice(product, '변경후 가격')}</td>
                <td data-label="-5%" class="price-5">${product['-5%'] || ''}</td>
                <td data-label="-10%" class="price-10">${product['-10%'] || ''}</td>
                <td data-label="-15%" class="price-15">${product['-15%'] || ''}</td>
                <td data-label="복사"><button type="button" class="btn btn-sm btn-outline-primary copy-row-btn">복사</button></td>
            `;
            const copyBtn = row.querySelector('.copy-row-btn');
            copyBtn.addEventListener('click', async () => {
                const field = getSelectedPriceField();
                const price = resolvePrice(product, field);
                const text = `${product['규격'] || ''}\t${price}`;
                const ok = await copyText(text);
                showCopyFeedback(copyBtn, ok);
            });
            resultsTableBody.appendChild(row);
        });
    }

    function handleSearch() {
        hideNotFound();
        hideMultiWarning();
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">검색어를 입력해주세요.</td></tr>`;
            return;
        }
        const filteredProducts = allProducts.filter(product => {
            return product['규격'] && product['규격'].toLowerCase().includes(searchTerm);
        });
        displayProducts(filteredProducts);
    }

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
                    const key = `${product['구분'] || ''}_${product['규격']}`;
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
        currentResults = [];
        resultsTableBody.innerHTML = `<tr><td colspan="8" class="text-start">검색어를 입력하고 검색 버튼을 누르세요.</td></tr>`;
    }

    async function handleCopyAll() {
        if (currentResults.length === 0) return;
        const field = getSelectedPriceField();
        const lines = currentResults.map(p => `${p['규격'] || ''}\t${resolvePrice(p, field)}`);
        const ok = await copyText(lines.join('\n'));
        showCopyFeedback(copyAllButton, ok);
    }

    async function handleCopyKakaoText() {
        if (currentResults.length === 0) {
            showCopyFeedback(copyKakaoTextButton, false);
            return;
        }
        const field = getSelectedPriceField();
        const lines = currentResults.map(p => `${p['규격'] || ''} ${resolvePrice(p, field)}`);
        const ok = await copyText(lines.join('\n'));
        showCopyFeedback(copyKakaoTextButton, ok);
    }

    async function handleCopyKakaoImage() {
        if (currentResults.length === 0) {
            showCopyFeedback(copyKakaoImageButton, false);
            return;
        }

        const field = getSelectedPriceField();
        const rows = currentResults.map((p, i) => ({
            no: String(i + 1),
            spec: p['규격'] || '',
            price: String(resolvePrice(p, field))
        }));

        const padding = 16;
        const rowHeight = 36;
        const headerHeight = 40;
        const colNoWidth = 50;
        const colSpecWidth = 220;
        const colPriceWidth = 120;
        const tableWidth = colNoWidth + colSpecWidth + colPriceWidth;
        const tableHeight = headerHeight + rows.length * rowHeight;
        const canvasWidth = tableWidth + padding * 2;
        const canvasHeight = tableHeight + padding * 2;

        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = canvasWidth * scale;
        canvas.height = canvasHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const startX = padding;
        const startY = padding;

        ctx.fillStyle = '#4A90D9';
        ctx.fillRect(startX, startY, tableWidth, headerHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No.', startX + colNoWidth / 2, startY + headerHeight / 2);
        ctx.fillText('규격', startX + colNoWidth + colSpecWidth / 2, startY + headerHeight / 2);
        ctx.fillText('단가', startX + colNoWidth + colSpecWidth + colPriceWidth / 2, startY + headerHeight / 2);

        ctx.font = '14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
        rows.forEach((row, i) => {
            const y = startY + headerHeight + i * rowHeight;
            if (i % 2 === 1) {
                ctx.fillStyle = '#f5f8fc';
                ctx.fillRect(startX, y, tableWidth, rowHeight);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(startX, y, tableWidth, rowHeight);
            }

            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.fillText(row.no, startX + colNoWidth / 2, y + rowHeight / 2);

            ctx.textAlign = 'left';
            let specText = row.spec;
            const maxSpecWidth = colSpecWidth - 16;
            while (ctx.measureText(specText).width > maxSpecWidth && specText.length > 3) {
                specText = specText.slice(0, -1);
            }
            if (specText !== row.spec) specText += '…';
            ctx.fillText(specText, startX + colNoWidth + 8, y + rowHeight / 2);

            ctx.textAlign = 'right';
            ctx.fillText(row.price, startX + colNoWidth + colSpecWidth + colPriceWidth - 10, y + rowHeight / 2);
        });

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= rows.length + 1; i++) {
            const y = startY + (i === 0 ? 0 : headerHeight + (i - 1) * rowHeight);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + tableWidth, y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(startX, startY + tableHeight);
        ctx.lineTo(startX + tableWidth, startY + tableHeight);
        ctx.stroke();

        [0, colNoWidth, colNoWidth + colSpecWidth, tableWidth].forEach(cx => {
            ctx.beginPath();
            ctx.moveTo(startX + cx, startY);
            ctx.lineTo(startX + cx, startY + tableHeight);
            ctx.stroke();
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                showCopyFeedback(copyKakaoImageButton, false);
                return;
            }
            const ok = await copyImageBlob(blob);
            if (ok) {
                showCopyFeedback(copyKakaoImageButton, true);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '가격표.png';
                a.click();
                URL.revokeObjectURL(url);
                showCopyFeedback(copyKakaoImageButton, true);
            }
        }, 'image/png');
    }

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') handleSearch();
    });

    if (multiSearchButton) multiSearchButton.addEventListener('click', handleMultiSearch);
    if (multiResetButton) multiResetButton.addEventListener('click', handleMultiReset);
    if (copyAllButton) copyAllButton.addEventListener('click', handleCopyAll);
    if (copyKakaoTextButton) copyKakaoTextButton.addEventListener('click', handleCopyKakaoText);
    if (copyKakaoImageButton) copyKakaoImageButton.addEventListener('click', handleCopyKakaoImage);

    fetchProducts();
});
