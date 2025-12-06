# Prompt for Claude: Deploy Dashboard2 Application to Railway using Mac Computer Control

**Objective:** Deploy the `Dashboard2` Next.js application from GitHub to Railway, including setting up the database, environment variables, and post-deployment configurations. Use the terminal on a Mac computer to execute all commands.

---

## 1. Goal

Your primary goal is to deploy the `Dashboard2` application to Railway. This involves:
1.  Setting up the local development environment on a Mac.
2.  Creating and configuring a Railway project.
3.  Deploying the application from the GitHub repository.
4.  Running database migrations and seeding initial data.
5.  Verifying the deployment and providing the live URL.

## 2. Context

-   **Project:** `Dashboard2`
-   **GitHub Repository:** `https://github.com/Mustafabeshara/Dashboard2.git`
-   **Tech Stack:** Next.js, Prisma, PostgreSQL, TypeScript
-   **Deployment Platform:** Railway.app
-   **Operating System:** macOS

## 3. Prerequisites

Before you begin, ensure the following tools are installed and accessible from the terminal. If not, install them using the provided commands.

-   **Homebrew:** The package manager for macOS. If not installed, run:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
-   **Node.js:** Required for running the application and installing packages.
    ```bash
    brew install node
    ```
-   **Git:** For cloning the repository.
    ```bash
    brew install git
    ```
-   **GitHub CLI:** For authenticating with GitHub.
    ```bash
    brew install gh
    ```
-   **Railway CLI:** For interacting with Railway.
    ```bash
    brew install railway
    ```
-   **Code Editor:** A code editor like Visual Studio Code should be available.

## 4. Step-by-Step Deployment Instructions

Follow these steps sequentially. **Do not proceed to the next step until the current one is successfully completed.**

### Phase 1: Setup Local Environment & Clone Repository

1.  **Open the Terminal** on the Mac.

2.  **Authenticate with GitHub:**
    ```bash
    gh auth login
    ```
    *(Follow the interactive prompts to authenticate with your GitHub account.)*

3.  **Authenticate with Railway:**
    ```bash
    railway login
    ```
    *(Follow the interactive prompts to log in to your Railway account.)*

4.  **Clone the Repository:**
    ```bash
    cd ~/Desktop  # Or any other preferred directory
    git clone https://github.com/Mustafabeshara/Dashboard2.git
    cd Dashboard2
    ```

### Phase 2: Initialize Railway Project

1.  **Initialize the Railway project:**
    ```bash
    railway init
    ```
    *(Select the appropriate options to create a new project.)*

2.  **Link to the GitHub repository:**
    ```bash
    railway link
    ```
    *(Link the project to the `Mustafabeshara/Dashboard2` repository.)*

3.  **Add a PostgreSQL Database:**
    ```bash
    railway add --database postgresql
    ```

### Phase 3: Configure Environment Variables

This is a critical step. Set the following environment variables using the `railway variables set` command. **Replace placeholder values** with actual secrets.

```bash
# Database URL (Railway sets this automatically, but verify)
# This command will link the database to your application
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# NextAuth Configuration
# Generate a strong secret for NEXTAUTH_SECRET
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
# Note: The NEXTAUTH_URL will be set automatically by Railway after the first deployment. We will update it later if needed.

# AI Provider API Keys
railway variables set GROQ_API_KEY="your_groq_api_key_here"
railway variables set GOOGLE_AI_API_KEY="your_google_ai_api_key_here"

# AWS S3 for File Storage
railway variables set AWS_ACCESS_KEY_ID="your_aws_access_key_id_here"
railway variables set AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key_here"
railway variables set AWS_REGION="us-east-1" # Or your preferred region
railway variables set AWS_S3_BUCKET="your-unique-s3-bucket-name-here"

# Cron Job Secret
# Generate a strong secret for CRON_SECRET
railway variables set CRON_SECRET=$(openssl rand -base64 32)

# Optional: Email Configuration (for Gmail)
# railway variables set EMAIL_USER="your_email@gmail.com"
# railway variables set EMAIL_PASSWORD="your_gmail_app_password_here"
```

### Phase 4: Deploy and Run Migrations

1.  **Start the deployment:**
    ```bash
    railway up
    ```
    *(This will build and deploy your application. Monitor the logs for any errors.)*

2.  **Get the application URL:** After the deployment is successful, Railway will provide a public URL (e.g., `dashboard2-production.up.railway.app`).

3.  **Update `NEXTAUTH_URL`:**
    ```bash
    railway variables set NEXTAUTH_URL=https://your-app-url.up.railway.app
    ```
    *(Replace `your-app-url.up.railway.app` with the actual URL from the previous step.)*

4.  **Run Database Migrations:**
    ```bash
    railway run npx prisma migrate deploy
    ```

5.  **Generate Prisma Client:**
    ```bash
    railway run npx prisma generate
    ```

6.  **Seed the Database:**
    ```bash
    railway run npx prisma db seed
    ```

### Phase 5: Verification

1.  **Open the Application:**
    ```bash
    railway open
    ```
    *(This will open the application in your default browser.)*

2.  **Check the Health Endpoint:** Navigate to `https://your-app-url.up.railway.app/api/health`. You should see `{"status":"ok"}`.

3.  **Check Logs:**
    ```bash
    railway logs
    ```
    *(Look for any runtime errors.)*

4.  **Test Login:** Try creating a new user and logging in through the UI.

## 5. Final Output

Once the deployment is successful and verified, provide the following:

1.  The live URL of the deployed `Dashboard2` application.
2.  Confirmation that all deployment steps were completed successfully.

---

**Important Notes for Claude:**

-   Execute each command in the terminal and wait for it to complete before moving to the next.
-   Pay close attention to the output of each command for any errors.
-   When setting environment variables, you will need to ask the user for the actual secret values.
-   If you encounter any issues, refer to the `RAILWAY_DEPLOYMENT.md` file in the repository for troubleshooting steps.
