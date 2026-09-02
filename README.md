# Reflections & Journal with Gemini (ReflectAI)

A secure, user-authenticated journaling and reflection platform built with **Firebase Authentication (Google Sign-In)**, **Cloud Firestore (User-Isolated Collections)**, and **Gemini 3.6 Flash** for multi-turn cognitive reflections, brainstorming, and executive summaries.

---

## 🛡️ Architecture & Security Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Browser                                  │
│  - Firebase Auth (Google Sign-In / OAuth Popup & Redirect)             │
│  - Firestore Client (Isolated writes to /users/{userId}/entries)       │
└──────────────────┬─────────────────────────────┬───────────────────────┘
                   │ HTTPS API Proxy             │ Direct SDK (Rules Guarded)
                   ▼                             ▼
┌────────────────────────────────────┐ ┌─────────────────────────────────┐
│     Full-Stack Server (Cloud Run)  │ │      Cloud Firestore            │
│  - Express + Vite                  │ │  - Security Rules:              │
│  - GEMINI_API_KEY via Secret Mgr   │ │    request.auth.uid == userId   │
│  - Resilient Model Fallback Ladder │ │  - /users/{userId}/entries      │
│    (3.6-flash -> 3.1-flash-lite)   │ │  - /users/{userId}/interactions │
└────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 🔒 1. Firestore Security Rules

To ensure strict data isolation where users cannot read, modify, or delete each other's reflections, deploy the following rules to Cloud Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🔑 2. Secret Manager Configuration & IAM Bindings

To protect API credentials from client-side exposure, the `GEMINI_API_KEY` is managed via Google Cloud Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 3. Cloud Run Deployment

Deploy the containerized full-stack application to Cloud Run:

```bash
# 1. Enable required Google Cloud services
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com

# 2. Deploy service with secret injection
gcloud run deploy reflect-ai-app \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 🏷️ 4. Required Campaign Labeling

Apply the mandatory verification label to register the deployed Cloud Run service for automated challenge evaluation:

```bash
gcloud run services update reflect-ai-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 📋 5. Threat Model Summary (The 5 Zones)

| Threat Zone | Identified Risk | Countermeasure | Status |
| :--- | :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection & oversized payloads | Schema validation, sanitized markdown output | **Enforced** |
| **2. Planning & Reasoning** | Rate limits & service unavailability | 4-tier model fallback ladder (3.6 Flash -> 3.1 Flash Lite -> Flash Latest -> 3.7 Flash) | **Enforced** |
| **3. Tool Execution** | Secret exposure in client bundle | Express server-side `/api/*` proxies holding `GEMINI_API_KEY` | **Enforced** |
| **4. Memory & State** | Cross-user data leaks in database | Strict Firestore Security Rules (`request.auth.uid == userId`) | **Enforced** |
| **5. Inter-System Communication** | Plaintext credential harvesting | Federated Google Sign-In via Firebase Auth | **Enforced** |

---

## 🧪 6. Functional Testing Walkthrough

1. **Sign-In Flow**: Click "Sign in with Google" or "Demo Guest Access" on the landing page to authenticate.
2. **Multi-Turn Reflections**: Submit a reflection or question to Gemini 3.6 Flash in the editor. Send a follow-up turn to observe conversation continuity.
3. **Executive Summarization**: Click "Summarize" to view cognitive breakdowns, emotional tone, and key takeaway bullets.
4. **Data Isolation & Persistence**: View reflections saved in real-time to `/users/{userId}/entries` with green sync indicators.
5. **History & Search**: Use the sidebar to filter past entries by keyword, tags, or categories.
