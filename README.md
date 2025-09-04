# On-Campus Nutrition Tracker

A React-based web application designed to help University of Oklahoma students track their nutrition and meet their dietary goals. The app integrates with OpenAI's ChatGPT to provide personalized nutritional guidance and recommendations.

**Course:** ICS-3203-001 Software Engineering  
**Instructor:** Dr. Mansoor Abdulhak  
**Team:** Group I

## 🚀 Features

### Current Features
- Interactive ChatGPT integration for nutritional advice
- Modern React-based user interface
- Responsive design for various devices
- Real-time AI-powered nutrition recommendations

### Planned Features
- Comprehensive database of OU campus dining hall nutrition information
- Nutritional analysis and tracking tools
- Personalized meal recommendations based on dietary preferences
- Integration with campus dining hall menus and schedules

## 🛠️ Technology Stack

### Current Stack
- **Frontend:** React 19.1.1 with TypeScript
- **Build Tool:** Vite 7.1.2
- **AI Integration:** OpenAI API (GPT-3.5-turbo)
- **Styling:** CSS3
- **Linting:** ESLint

### Planned Database Integration
- **Database:** PostgreSQL or MongoDB for nutrition data storage
- **Backend API:** Node.js/Express or Python/FastAPI
- **Data Sources:** OU Dining Services, USDA Food Database
- **Real-time Updates:** Automated menu synchronization with campus dining halls

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- [Git](https://git-scm.com/)
- OpenAI API key

## 🔧 Environment Setup

1. Create a `.env` file in the root directory
2. Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```
   **Note:** Never commit your `.env` file or any of its contents to version control.

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

You're all set! 🎉


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

#### Production Build
```bash
npm run build
```
This creates an optimized production build in the `dist` folder.

#### Preview Production Build
```bash
npm run preview
```
This serves the production build locally for testing.

## 📁 Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Application styles
├── main.tsx             # Application entry point
├── index.css            # Global styles
├── chatGptService.ts    # OpenAI API integration
└── assets/              # Static assets (images, icons)
```

## 🗄️ Database Implementation Plans

### Overview
We plan to implement a comprehensive nutrition database that will serve as the foundation for our campus nutrition tracking system. This database will contain detailed nutritional information about all food items served across University of Oklahoma dining facilities.

### Database Schema Design

#### Core Tables
- **Food Items**: Complete nutritional profiles of campus food items
- **Dining Locations**: OU dining halls, cafes, and food service locations
- **Menu Items**: Daily/weekly menu offerings with availability
- **Nutritional Data**: Macronutrients, micronutrients, allergens, and dietary restrictions
- **User Preferences**: Dietary goals, restrictions, and meal preferences

### Implementation Phases

#### Phase 1: Data Collection & Validation
- Establish partnerships with OU Dining Services
- Create data collection protocols for nutrition information
- Implement data validation and quality assurance processes
- Build initial database schema and relationships

#### Phase 2: API Development
- Develop RESTful API endpoints for nutrition data access
- Implement search and filtering capabilities
- Create real-time menu synchronization system
- Build data import/export functionality

#### Phase 3: Frontend Integration
- Integrate database queries with existing React application
- Implement food search and filtering interfaces
- Create nutritional analysis and tracking features
- Develop personalized recommendation algorithms

#### Phase 4: Advanced Features
- Real-time menu updates and notifications
- Integration with campus dining hall schedules
- Advanced nutritional analysis and goal tracking

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

**Note:** This project is currently in development. Features and functionality may change as development progresses.