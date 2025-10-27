# GuardSOL

This is a **frontend** repository for the Solana Address Checker browser extension. The extension allows users to quickly check a Solana wallet address for potential risks before sending a transaction.

It receives data from a separate **backend service** that aggregates information from multiple sources to form a risk score.

### Key Features

* **Risk Score:** Classifies addresses as (Low, Medium, High).
* **Data Sources:** The backend uses Helius, GoPlus Security, and a custom blacklist.
* **Local History:** Stores your check history in the browser's local storage.
* **UI:** Clean and simple interface (`popup.html`) for quick access.


## 🚀 Features

- ✅ Check any Solana wallet for **scam / malicious risk**
- ✅ Uses **GoPlus API** (signed token flow)
- ✅ Uses **Helius API** for on-chain data
- ✅ Local **SQLite** database for history & blacklist
- ✅ Chrome extension front-end for easy use
- ✅ Works cross-platform (Windows, Linux, macOS)

---

## 🧩 Requirements

- **Node.js v18+** (LTS or v20 recommended)
- **npm** (comes with Node)
- Chrome or Chromium browser

---

## ⚙️ Setup Guide

### 1️⃣ Clone or Download

```bash
git clone https://github.com/lopokl/GuardSOL-extension.git
cd GuardSOL-extension
```
### 2️⃣🧩 Chrome Extension Setup

Open Chrome → chrome://extensions/

Enable Developer Mode

Click Load unpacked

Select the folder GuardSOL-extension/extension

🙌 Credits

GoPlus Labs

Helius

Built by GuardSOL initiative using Node.js + Chrome Extension.
