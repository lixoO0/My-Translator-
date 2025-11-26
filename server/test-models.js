require('dotenv/config');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('✅ API Key found (length:', GEMINI_API_KEY.length, ')');
console.log('🔍 Testing available models...\n');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Спочатку спробуємо отримати список доступних моделей
async function listAvailableModels() {
  try {
    console.log('📋 Fetching available models from API...\n');
    // Використовуємо REST API для отримання списку моделей
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      console.log('✅ Available models:');
      data.models.forEach(model => {
        console.log(`   - ${model.name}`);
      });
      console.log('');
      
      // Фільтруємо моделі, які підтримують generateContent
      const supportedModels = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      if (supportedModels.length > 0) {
        console.log('✅ Models supporting generateContent:');
        supportedModels.forEach(model => {
          console.log(`   - ${model}`);
        });
        console.log('');
        return supportedModels;
      }
    }
    
    console.log('⚠️  Could not fetch models list, will try default models\n');
    return null;
  } catch (error) {
    console.error('⚠️  Error fetching models list:', error.message);
    console.log('Will try default models\n');
    return null;
  }
}

// Список моделей для тестування (якщо не вдалося отримати з API)
const defaultModelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-pro',
  'models/gemini-1.5-flash',
  'models/gemini-1.5-pro',
  'models/gemini-pro',
];

async function testModel(modelName) {
  try {
    console.log(`🧪 Testing model: ${modelName}...`);
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Спробуємо згенерувати простий текст
    const result = await model.generateContent('Say "Hello" in one word');
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ ${modelName} - SUCCESS! Response: "${text.trim()}"\n`);
    return { model: modelName, success: true, response: text.trim() };
  } catch (error) {
    console.error(`❌ ${modelName} - FAILED`);
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\n')[0]);
    }
    console.log('');
    return { model: modelName, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting model tests...\n');
  
  // Спочатку спробуємо отримати список доступних моделей
  const availableModels = await listAvailableModels();
  const modelsToTest = availableModels || defaultModelsToTest;
  
  const results = [];
  
  for (const modelName of modelsToTest) {
    const result = await testModel(modelName);
    results.push(result);
    
    // Якщо знайшли робочу модель, продовжуємо тестувати інші для порівняння
    // але можемо зупинитися на першій успішній
    if (result.success) {
      console.log(`\n✅ Found working model: ${modelName}`);
      console.log('💡 You can use this model in geminiService.ts\n');
    }
  }
  
  // Підсумок
  console.log('\n📊 Test Summary:');
  console.log('================');
  const workingModels = results.filter(r => r.success);
  const failedModels = results.filter(r => !r.success);
  
  if (workingModels.length > 0) {
    console.log('\n✅ Working models:');
    workingModels.forEach(r => {
      console.log(`   - ${r.model}`);
    });
  }
  
  if (failedModels.length > 0) {
    console.log('\n❌ Failed models:');
    failedModels.forEach(r => {
      console.log(`   - ${r.model}: ${r.error}`);
    });
  }
  
  if (workingModels.length === 0) {
    console.log('\n⚠️  No working models found. Please check:');
    console.log('   1. GEMINI_API_KEY is correct');
    console.log('   2. API key has access to Generative AI');
    console.log('   3. Internet connection is working');
    process.exit(1);
  }
  
  // Рекомендація
  const recommendedModel = workingModels[0].model;
  console.log(`\n💡 Recommended model: ${recommendedModel}`);
  console.log(`   Update geminiService.ts to use: model: '${recommendedModel}'`);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

