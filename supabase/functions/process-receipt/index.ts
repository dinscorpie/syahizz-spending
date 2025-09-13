import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  subcategory?: string;
}

interface ReceiptData {
  vendor_name: string;
  date: string;
  total_amount: number;
  tax_amount?: number;
  tip_amount?: number;
  items: ReceiptItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image data provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing receipt with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a receipt processing AI. Extract all relevant information from the receipt image and return it in JSON format. For each item, categorize it appropriately (e.g., Food, Transportation, Shopping, etc.). Return the data in this exact structure:
            {
              "vendor_name": "string",
              "date": "YYYY-MM-DD",
              "total_amount": number,
              "tax_amount": number,
              "tip_amount": number,
              "items": [
                {
                  "name": "string",
                  "quantity": number,
                  "unit_price": number,
                  "total_price": number,
                  "category": "string",
                  "subcategory": "string"
                }
              ]
            }
            
            Common categories: Food, Transportation, Shopping, Entertainment, Healthcare, Utilities, Housing, Personal Care, Education, Travel, Other.
            Be precise with amounts and dates. If information is unclear, make reasonable assumptions.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all information from this receipt:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OpenAI response received');
    
    const extractedData = JSON.parse(result.choices[0].message.content);
    
    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process receipt' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});