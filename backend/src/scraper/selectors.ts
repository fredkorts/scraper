export const productSelectors = {
    productCard: "li.product, li.product-col.product",
    title: "h2.woocommerce-loop-product__title, .woocommerce-loop-product__title",
    productLink: "a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link, a",
    image: "img",
    currentPrice: ".price .amount, .price ins .amount, .price bdi",
    salePrice: ".price ins .amount, .price ins bdi",
    originalPrice: ".price del .amount, .price del bdi",
    outOfStock: ".outofstock, .stock.out-of-stock, .ast-shop-product-out-of-stock",
    inStock: ".stock.in-stock",
    productTemplateScript: "ul.products script[type='text/template']",
    nextPage: "a.next, .next.page-numbers",
} as const;
