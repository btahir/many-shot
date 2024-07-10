# Many-Shot Prediction App

## Overview

The Many-Shot Prediction App allows users to run multiple predictions using various models, providing a platform to compare and analyze the performance of different AI models. It supports models from OpenAI and Anthropic, and lets users input a question along with multiple answer options to receive a prediction based on the selected model.

## Getting Started

Clone the repo and install all dependencies. You can run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Setup Environment Variables

The app will only work for the platform who's API key you have provided. Create a .env.local file in the root directory of the project and add your API keys:

```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```
