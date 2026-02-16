#!/usr/bin/env node

/**
 * Generate Welcome Screen Video using Replicate API
 * 
 * Usage:
 *   1. Set your Replicate API token: export REPLICATE_API_TOKEN=r8_xxxxx
 *   2. Run: node generate-welcome-video.js
 *   3. Video will be saved to the frontend public folder
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OUTPUT_DIR = path.join(__dirname, '../AI in Charge/Development/be/frontend/public/assets/videos');
const OUTPUT_FILE = 'forest-walk.mp4';

// Video generation prompt - SLOW MOTION FOREST (static shot with slow motion elements)
const VIDEO_PROMPT = `Cinematic slow motion shot of sunlight streaming through a peaceful green forest. 
Slow motion leaves gently falling and floating through the air.
Rays of golden light filtering through tall trees, 120fps slow motion footage.
Particles of dust and pollen drifting slowly in the sunbeams.
Dreamy, ethereal forest atmosphere with bokeh effect on background.
Static camera, no movement, just slow motion nature elements floating.
Peaceful, meditative, calming. High-end nature documentary style.
Morning light, green foliage, serene woodland scene.`;

if (!REPLICATE_API_TOKEN) {
  console.error('\n❌ Error: REPLICATE_API_TOKEN environment variable not set\n');
  console.log('Set it with:');
  console.log('  export REPLICATE_API_TOKEN=r8_your_token_here\n');
  console.log('Get your token at: https://replicate.com/account/api-tokens\n');
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created directory: ${OUTPUT_DIR}`);
}

async function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function generateVideo() {
  console.log('\n🎬 AI In Charge - Welcome Video Generator\n');
  console.log('━'.repeat(50));
  console.log('\n📝 Prompt:', VIDEO_PROMPT.substring(0, 100) + '...\n');

  // Try different video models (in order of preference)
  const models = [
    {
      name: 'Minimax Video-01',
      version: 'minimax/video-01',
      input: { prompt: VIDEO_PROMPT, prompt_optimizer: true }
    },
    {
      name: 'Luma Dream Machine',
      version: 'luma/dream-machine',
      input: { prompt: VIDEO_PROMPT }
    },
    {
      name: 'Kling Video',
      version: 'fofr/kling-video',
      input: { prompt: VIDEO_PROMPT, duration: 5 }
    }
  ];

  for (const model of models) {
    console.log(`\n🚀 Trying ${model.name}...`);
    
    try {
      // Start prediction
      const createResponse = await makeRequest(
        'https://api.replicate.com/v1/predictions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          }
        },
        {
          version: model.version,
          input: model.input
        }
      );

      if (createResponse.status !== 201 && createResponse.status !== 200) {
        console.log(`   ⚠️  Model unavailable: ${createResponse.data?.detail || 'Unknown error'}`);
        continue;
      }

      const prediction = createResponse.data;
      console.log(`   ✅ Prediction started: ${prediction.id}`);
      console.log('   ⏳ Generating video (this may take 2-5 minutes)...\n');

      // Poll for completion
      let status = prediction.status;
      let result = prediction;
      let dots = 0;

      while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const pollResponse = await makeRequest(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
            }
          }
        );

        result = pollResponse.data;
        status = result.status;
        dots = (dots + 1) % 4;
        process.stdout.write(`\r   Status: ${status} ${'.'.repeat(dots)}${' '.repeat(3 - dots)}   `);
      }

      console.log('\n');

      if (status === 'succeeded') {
        const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        
        if (videoUrl) {
          console.log('   📥 Downloading video...');
          const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
          await downloadFile(videoUrl, outputPath);
          
          console.log('\n━'.repeat(50));
          console.log('\n✅ SUCCESS!\n');
          console.log(`📍 Video saved to:\n   ${outputPath}\n`);
          console.log('Next steps:');
          console.log('1. Check the video quality');
          console.log('2. Tell the assistant to add video to welcome screen\n');
          return true;
        }
      } else {
        console.log(`   ❌ Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n❌ All models failed. Please try generating manually at replicate.com\n');
  return false;
}

generateVideo().catch(console.error);
