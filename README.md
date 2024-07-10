# Many-Shot Predictions

[![Watch the demo video](https://img.shields.io/badge/Watch-Demo%20Video-blue?style=for-the-badge&logo=loom)](https://www.loom.com/share/714872afe1414c94b1ff1a51e34441ca?sid=5a55bf26-bb21-4671-b9ee-b201ff193efd)

![Demo GIF](/public/demo.gif)

## Overview

The Many-Shot Prediction App is a powerful tool for comparing and analyzing the performance of various AI models. It allows users to run multiple predictions on the same prompt using different models, including those from OpenAI, Anthropic, Gemini, and a local model.

Recent research has shown that running the same prompt multiple times can lead to greater predictability in language model outputs. This app provides an intuitive interface to run a prompt N times and visualize the results, helping you understand the distribution and consistency of model responses.

## Features

- Support for multiple AI platforms: OpenAI, Anthropic, Gemini, and a local model
- Customizable number of prediction runs
- Input for questions and multiple answer options
- Visualization of prediction results
- Easy comparison of model performances

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/btahir/many-shot.git
   cd many-shot-predictions
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables (see below)

4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to use the app.

## Environment Variables

Create a `.env.local` file in the root directory and add your API keys:

```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key
```

**Note:** The app will only work for the platforms whose API keys you have provided. If you want to test it out quickly, you can use the local model option, although it may be slower.

## Demo App

You can try out the demo app **[here](https://many-shot.vercel.app)**. Please note that the demo version only works with the local model option.

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
