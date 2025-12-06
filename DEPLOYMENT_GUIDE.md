> **Note:** This guide is for deploying the cleaned Dashboard2 codebase to Vercel and Neon. It assumes you have a GitHub account and have cloned the repository.

# Vercel + Neon Deployment Guide

Welcome to your deployment guide! This document will walk you through deploying your Dashboard2 application to the web in **under 20 minutes**. We'll use Vercel for hosting our Next.js application and Neon for our serverless PostgreSQL database.

## Table of Contents

1.  [**Part 1: Setting Up Your Neon Database**](#part-1-setting-up-your-neon-database)
2.  [**Part 2: Deploying to Vercel**](#part-2-deploying-to-vercel)
3.  [**Part 3: Post-Deployment Setup**](#part-3-post-deployment-setup)
4.  [**Troubleshooting**](#troubleshooting)

---

## Part 1: Setting Up Your Neon Database

First, we need a database. Neon provides a serverless PostgreSQL database that works perfectly with Vercel.

### 1.1. Create a Neon Account

1.  Go to [**console.neon.tech**](https://console.neon.tech) and sign up for a new account. You can use your GitHub account to sign up for free.

### 1.2. Create a New Project

1.  After signing up, you'll be prompted to create a new project. Give it a name, like `dashboard2-production`.
2.  Choose the latest PostgreSQL version (e.g., PostgreSQL 16).
3.  Select a region closest to you or your users.
4.  Click **"Create Project"**.

### 1.3. Get Your Database Connection String

1.  Once your project is created, you'll see a **Connection Details** widget on your dashboard.
2.  Make sure to select **"Connection String"** (it looks like a URL).
3.  Copy the connection string. It will look like this:

    ```
    postgresql://<user>:<password>@<host>/<database>?sslmode=require
    ```

4.  **Save this connection string somewhere safe.** We'll need it for Vercel.

> **Congratulations!** You now have a production-ready database. That was easy!

---

## Part 2: Deploying to Vercel

Now, let's deploy our application to Vercel. Vercel is the company behind Next.js, so deployment is seamless.

### 2.1. Create a Vercel Account

1.  Go to [**vercel.com**](https://vercel.com) and sign up for a new account. Again, you can use your GitHub account for a quick setup.

### 2.2. Import Your GitHub Repository

1.  From your Vercel dashboard, click **"Add New..."** -> **"Project"**.
2.  In the **"Import Git Repository"** section, find your `Dashboard2` repository and click **"Import"**.

### 2.3. Configure Your Project

1.  Vercel will automatically detect that you're using Next.js. You don't need to change any build settings.
2.  Open the **"Environment Variables"** section.
3.  Here, we'll add the required environment variables from your `ENV_VARIABLES_CHECKLIST.md` file.

    | Key               | Value                                                                                             |
    | ----------------- | ------------------------------------------------------------------------------------------------- |
    | `DATABASE_URL`    | Paste the **Neon connection string** you copied earlier.                                          |
    | `NEXTAUTH_SECRET` | Generate a new secret by running `openssl rand -base64 32` in your terminal, and paste it here. |

4.  Click **"Deploy"**.

> **That's it!** Vercel will now build and deploy your application. This might take a few minutes. Once it's done, you'll get a production URL!

### 2.4. Update `NEXTAUTH_URL`

1.  After the first deployment is successful, Vercel will give you a URL (e.g., `https://dashboard2-xyz.vercel.app`).
2.  Go back to your Vercel project settings -> **Environment Variables**.
3.  Add a new variable:

    | Key            | Value                               |
    | -------------- | ----------------------------------- |
    | `NEXTAUTH_URL` | Your Vercel deployment URL.         |

4.  **Redeploy** your application for the changes to take effect (Go to the "Deployments" tab and click "Redeploy" on the latest one).

---

## Part 3: Post-Deployment Setup

Your application is live, but the database is empty. Let's seed it with the initial data.

### 3.1. Seed the Production Database

1.  You'll need to run the production seed script **one time** to create the admin user and initial data.
2.  You can do this by connecting to your Vercel deployment's terminal or by running the script locally and pointing it to your production database.

    *We recommend running it from your local machine for simplicity.*

3.  **On your local machine:**
    1.  Make sure you have the codebase cloned.
    2.  Open a terminal in the project directory.
    3.  Set the production database URL as an environment variable:

        ```bash
        export DATABASE_URL="<your_neon_connection_string>"
        ```

    4.  Run the production seed script:

        ```bash
        node scripts/seed-production.js
        ```

4.  You should see a success message with the admin login credentials.

### 3.2. Log In and Change Your Password

1.  Go to your Vercel application URL.
2.  Log in with the admin credentials:
    -   **Email:** `admin@beshara.com`
    -   **Password:** `admin123`
3.  **IMPORTANT:** Go to the user settings and **change the admin password immediately**.

> **🎉 Congratulations! Your Dashboard2 application is now fully deployed and ready to use!**

---

## Troubleshooting

-   **"Build failed on Vercel"**: Check the build logs on Vercel. It's often a missing environment variable.
-   **"500 Internal Server Error"**: Check the runtime logs on Vercel. This usually means the application can't connect to the database. Double-check your `DATABASE_URL`.
-   **"Authentication errors"**: Ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set correctly.

For more detailed troubleshooting, refer to the `ENV_VARIABLES_CHECKLIST.md` file.
