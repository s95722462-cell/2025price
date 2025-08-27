document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTableBody = document.getElementById('resultsTableBody');
    let allProducts = [];

    // Function to fetch product data
    async function fetchProducts() {
        try {
            const response = await fetch('price_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allProducts = await response.json();
            // Do not display all products initially, show a prompt
                        resultsTableBody.innerHTML = `<tr><td colspan="7" class="text-start">검색어를 입력하고 검색 버튼을 누르세요.</td></tr>`;
        } catch (error) {
            console.error('Error fetching product data:', error);
            resultsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">데이터를 불러오는 데 실패했습니다. (${error.message})</td></tr>`;
        }
    }

    // Function to display products in the table
    function displayProducts(products) {
        resultsTableBody.innerHTML = ''; // Clear previous results
        if (products.length === 0) {
            resultsTableBody.innerHTML = `<tr><td colspan="7" class="text-center">검색 결과가 없습니다.</td></tr>`;
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
            `;
            resultsTableBody.appendChild(row);
        });
    }

    // Function to handle search
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
                if (!searchTerm) {
            resultsTableBody.innerHTML = `<tr><td colspan="7" class="text-center">검색어를 입력해주세요.</td></tr>`;
            return;
        }
        const filteredProducts = allProducts.filter(product => {
            // Search only in the '규격' field
            const specMatch = product['규격'] && product['규격'].toLowerCase().includes(searchTerm);
            return specMatch;
        });
        displayProducts(filteredProducts);
    }

    // Event Listeners
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Initial fetch of products when the page loads
    fetchProducts();
});