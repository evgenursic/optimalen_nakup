export const sanitizedBmwHtml = `
<!doctype html><html><body>
  <h1>BMW 320d xDrive Touring</h1>
  <table>
    <tr><th>Število prevoženih kilometrov</th><td>24 414 km</td></tr>
    <tr><th>Moč</th><td>140 kW / 190 KM</td></tr>
    <tr><th>Vrsta goriva</th><td>Dizelsko gorivo</td></tr>
  </table>
  <p>Cena 45 490 €</p>
  <ul><li>M Sport paket</li></ul>
  <p>BMW Premium Selection, 24-mesečno jamstvo.</p>
</body></html>`;

export const sanitizedEnaaHtml = `
<!doctype html><html><body>
  <h1>Prenosnik Primer Pro 14</h1>
  <div class="single-product-price-content">1.299,99 €</div>
  <table>
    <tr><td>Garancija v mesecih</td><td>24</td></tr>
    <tr><td>Šifra</td><td>TEST-14</td></tr>
  </table>
  <span>Na zalogi</span>
</body></html>`;

export const sanitizedBigBangHtml = `
<!doctype html><html><body>
  <h1>Hladilnik Primer 300</h1>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Hladilnik Primer 300",
    "sku": "TEST-300",
    "brand": {"@type": "Brand", "name": "Primer"},
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "699.99",
      "availability": "https://schema.org/InStock"
    }
  }
  </script>
</body></html>`;
