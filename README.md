# GuardSOL

This is a **frontend** repository for the Solana Address Checker browser extension. The extension allows users to quickly check a Solana wallet address for potential risks before sending a transaction.

It receives data from a separate **backend service** that aggregates information from multiple sources to form a risk score.

### Key Features

* **Risk Score:** Classifies addresses as (Low, Medium, High).
* **Data Sources:** The backend uses Helius, GoPlus Security, and a custom blacklist.
* **Local History:** Stores your check history in the browser's local storage.
* **UI:** Clean and simple interface (`popup.html`) for quick access.
