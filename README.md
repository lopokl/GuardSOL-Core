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

- Chrome or Chromium browser

---

## ⚙️ Setup Guide

### 1️⃣ Clone or Download

```bash
git clone https://github.com/lopokl/GuardSOL-extension.git
cd GuardSOL-extension
```
or
1. Go to the project page on GitHub:  
   👉 [https://github.com/lopokl/GuardSOL-extension](https://github.com/lopokl/GuardSOL-extension)

2. Click the green **Code** button → **Download ZIP**.
### 2️⃣🧩 Chrome Extension Setup

Open Chrome → chrome://extensions/

Enable Developer Mode

Click Load unpacked

Select the folder GuardSOL-extension/extension

# 🛡️ GuardSOL — Manual Installation Guide

This guide explains how to install the **GuardSOL** browser extension manually from a ZIP file downloaded from GitHub.

---

## 🧩 Step 1 — Download the ZIP file

1. Go to the project page on GitHub:  
   👉 [https://github.com/lopokl/GuardSOL-extension](https://github.com/lopokl/GuardSOL-extension)

2. Click the green **Code** button → **Download ZIP**.

3. After downloading, you should have a file named, for example:

GuardSOL-main.zip


---

## 📦 Step 2 — Extract the ZIP

1. Right-click the ZIP file → **Extract All** (or **Unzip**).
2. After extraction, you’ll get a main folder:

GuardSOL-main/


3. Inside that folder, you will find two subfolders:

GuardSOL-main/
├── backend/
└── extension/


- The `extension/` folder contains the **Chrome extension**.
- The `backend/` folder contains the optional **server**.

---

## 🌐 Step 3 — Load the Extension in Chrome

1. Open **Google Chrome**.
2. In the address bar, type and open:

chrome://extensions/

3. Turn on the **Developer mode** toggle (top-right corner).
4. Click **Load unpacked**.
5. Browse to and select the folder:

GuardSOL-main/extension


6. The **GuardSOL** extension should now appear in your extensions list.

---

## ✅ Step 4 — Verify Installation

- You should see the **GuardSOL** icon next to your browser’s address bar.
- Click it to open the popup window.

---

## 📁 Example Folder Structure

GuardSOL-main/
├── backend/
└── ...
└── extension/
├── manifest.json
├── popup.html
├── popup.js
├── styles.css
└── ...


---

## 💡 Notes

- Do **not** upload the ZIP file directly to Chrome. Always load the **unpacked folder**.
- If you update the code, click **Reload** in `chrome://extensions/` to apply changes.
- The extension works in most Chromium-based browsers: **Chrome**, **Brave**, **Edge**, etc.

---

### 🧠 Replace placeholders before uploading:
- `your-username/your-repo-name` → your actual GitHub repo path.  
- Folder names if they differ (e.g. `GuardSOL-main`, `extension`, `backend`).

---

⭐ **Done!** Your GuardSOL extension is now ready to use.

🙌 Credits

GoPlus Labs

Helius

Built by GuardSOL initiative using Node.js + Chrome Extension.
