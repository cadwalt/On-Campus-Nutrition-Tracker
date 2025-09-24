# On-Campus Nutrition Tracker

A React-based web application designed to help University of Oklahoma students track their nutrition and meet their dietary goals. The app integrates with OpenAI's ChatGPT to provide personalized nutritional guidance and recommendations.

**Course:** CS-3203-001 Software Engineering  
**Instructor:** Dr. Mansoor Abdulhak  
**Team:** Group I

## 🚀 Features

- Interactive ChatGPT integration for nutritional advice (Ask questions, meal planning)
- Firebase Authentication (Email/Password): Sign up, sign in, sign out
- Profile management: Update display name and view account details
- Firestore integration: Sample dining data fetch (e.g., `restaurants/testRestaurant`)
- Dashboard with Quick Stats and Recent Meals sections
- Global sidebar navigation with user-aware CTA/profile link
- Modern React + TypeScript UI with responsive styling

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

If you're on Mac, I recommend installing Node.js using Brew with npm. If you're on Windows, I recommend installing using Chocolatey with npm. Here's a tutorial if you need more help: [tutorial](https://www.youtube.com/watch?v=ICysCMwOmcM)


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

## 🔧 Environment Setup

1. Create a `.env` file in the root directory
2. Add your OpenAI and Firebase keys:
   ```
   # OpenAI
   VITE_OPENAI_API_KEY=your_openai_api_key

   # Firebase
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
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


## 📁 Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Application styles
├── main.tsx             # Application entry point
├── index.css            # Global styles
├── chatGptService.ts    # OpenAI API integration
├── firebase.ts          # Firebase initialization (Auth, Firestore, Analytics)
└── assets/              # Static assets (images, icons)

pages/
├── Dashboard.tsx        # Nutrition dashboard (ChatGPT, stats, recent meals)
├── AuthPage.tsx         # Sign in / Sign up hub
└── ProfilePage.tsx      # Profile management (edit display name, sign out)

components/
├── GlobalSidebar.tsx    # App-wide navigation with user-aware CTA/profile
├── RestaurantDisplay.tsx# Firestore example: fetches `restaurants/testRestaurant`
├── SignInForm.tsx       # Email/password sign-in
└── SignUpForm.tsx       # Account creation and user doc bootstrap
```

## 🙌 Using the App

1. Start the dev server and open the app.
2. Go to Auth to create an account or sign in.
3. After signing in, open Profile to edit your display name.
4. Visit Dashboard to:
   - Ask the Nutrition Assistant questions (uses OpenAI).
   - View Quick Stats and Recent Meals sections.
   - See sample dining data from Firestore in Restaurant Info.

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` to check for code issues
4. Test your changes thoroughly using `npm run dev`
5. Merge the branch into main

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
