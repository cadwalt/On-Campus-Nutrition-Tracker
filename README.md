# On-Campus Nutrition Tracker

A React-based web application designed to help University of Oklahoma students track their nutrition and meet their dietary goals. The app integrates with OpenAI's ChatGPT to provide personalized nutritional guidance and recommendations.

**Course:** CS-3203-001 Software Engineering  
**Instructor:** Dr. Mansoor Abdulhak  
**Team:** Group I

## 🛠️ Technology Stack

- **Frontend:** React 19.1.1 with TypeScript
- **Routing:** react-router-dom 7.9.1
- **Build Tool:** Vite 7.1.2
- **Auth & Database:** Firebase (Auth, Firestore, Analytics)
- **AI Integration:** OpenAI API (gpt-3.5-turbo)
- **Styling:** CSS3
- **Linting:** ESLint


## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/download) (version 16 or higher)*

If you're on Mac, I recommend installing Node.js using Brew with npm. If you're on Windows, I recommend installing using Chocolatey with npm. Here's a [tutorial](https://www.youtube.com/watch?v=ICysCMwOmcM) if you need more help.


## 📥 Cloning the Repository

To get started with the project, follow these steps:

First, make sure you have Git installed in your code editor. Then,

1. Open a terminal or command prompt.
2. Navigate to the folder where you want to save the project.
3. Run the following command to clone the repository:
    ```bash
    git clone <repository-url>
    ```
    Replace `<repository-url>` with the actual URL of the repository.
4. Navigate into the cloned folder:
    ```bash
    cd On-Campus-Nutrition-Tracker
    ```


## 🚀 Getting Started

### Installing Dependencies
1. Open a terminal or command prompt.
2. Navigate to the project folder:
    ```bash
    cd On-Campus-Nutrition-Tracker
    ```
3. Run the following command to install all required dependencies:
    ```bash
    npm install
    ```

### Running Tests
1. Open a terminal or command prompt
2. Run the following command to run **all** tests in the repo:
    ```bash
    npm test
    ```
3. To run a **specific** test file, e.g., `test_database_validator.test.ts`, run the following command:
    ```bash
    npx vitest run src/testt/test_database_validator.test.ts
    ```


## 🔧 Environment Setup

1. Create a `.env` file in the root directory
2. Add the team's OpenAI and Firebase keys
   **Note:** Never commit your `.env` file or any of its contents to version control.


### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build the project for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint to check for code issues |

### Running the Project

#### Development Mode
```bash
npm run dev
```
This will start the Vite development server, typically at `http://localhost:5173`. *

*(If this url does not work, use the URL that comes up next to `Local:` when you run this command in your terminal)

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` to check for code issues
4. Test your changes thoroughly using `npm run dev`
5. Create a pull request in Github, adding Copilot as a reviewer.
6. After Copilot and Cursor Bugbot have reviewed your PR, verify and/or fix any issues they have noted.
7. Merge the branch into main using "Squash and Merge".

## 🐛 Troubleshooting

### Common Issues

**API Key Not Working:**
- Ensure your `.env` file is in the root directory
- Verify the API key format: `VITE_OPENAI_API_KEY=your_key_here`

**Build Errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that you're using Node.js version 16 or higher
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Development Server Issues:**
- Try a different port: `npm run dev -- --port 3000`
- Clear browser cache and restart the dev server

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team Members

- Ethan Gulley
- Joy Mosisa
- Johnpaul Nguyen
- Haidyn Peterson
- Alex Truong
- Cadence Walton
- Cambren Williams

---

**Note:** This project is currently in development. Features and functionality will change as development progresses.

