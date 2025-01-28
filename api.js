class DeepseekService {
  constructor() {
    this.baseURL = 'https://api.deepseek.com/v1';
    this.apiKey = 'sk-91e884a2f34b4fa68dc51ef72f1a8732';
  }

  async generateBlessing(params) {
    const prompt = this.constructPrompt(params);
    console.log('Sending prompt to API:', prompt);
    
    try {
      console.log('Sending request to Deepseek API...');
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的祝福语创作助手。
                       请严格按照以下格式回复：
                       {
                         "blessings": [
                           "祝福语1",
                           "祝福语2",
                           "祝福语3",
                           "祝福语4",
                           "祝福语5"
                         ],
                         "questions": [
                           "问题1",  // 根据生成的祝福语，提出有针对性的改进问题
                           "问题2",
                           "问题3"
                         ]
                       }
                       每条祝福语限制在50字以内。
                       questions中请提供3个针对性的问题，帮助用户改进祝福语。
                       这些问题应该基于生成的祝福语内容，引导用户提供更具体的反馈。`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: this.getMaxTokens(params.length),
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          top_p: 0.9,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error?.message || 'API 请求失败');
      }

      const data = await response.json();
      console.log('API Response:', {
        id: data.id,
        model: data.model,
        created: new Date(data.created * 1000).toISOString(),
        content: data.choices[0].message.content,
        usage: data.usage
      });
      
      return this.parseJSONResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.message || '生成祝福语失败，请稍后重试');
    }
  }

  parseJSONResponse(content) {
    try {
        // 首先尝试提取祝福语数组
        const blessingsMatch = content.match(/"blessings":\s*\[([\s\S]*?)\]/);
        const blessings = blessingsMatch ? 
            blessingsMatch[1]
                .split(',')
                .map(b => b.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'))
                .filter(b => b.length > 0)
            : ['暂无祝福语'];

        // 提取问题数组并去除注释
        const questionsMatch = content.match(/"questions":\s*\[([\s\S]*?)\]/);
        const questions = questionsMatch ?
            questionsMatch[1]
                .split(',')
                .map(q => {
                    // 去除注释部分
                    const questionText = q.split('//')[0];
                    return questionText.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"');
                })
                .filter(q => q.length > 0)
            : ['您对这些祝福语有什么想法？'];

        // 确保祝福语数量为5个
        const finalBlessings = blessings.slice(0, 5);
        while (finalBlessings.length < 5) {
            finalBlessings.push('暂无更多祝福语');
        }

        return {
            blessings: finalBlessings,
            questions: questions
        };
    } catch (error) {
        console.error('Parse Error:', error);
        return {
            blessings: ['暂无祝福语'],
            questions: ['您对这些祝福语有什么想法？']
        };
    }
  }

  constructPrompt(params) {
    return `请为${params.target}生成5个不同的${params.style}风格的祝福语，
            每个祝福语的长度要求${params.length}，
            额外要求：${params.requirements}。
            请确保祝福语温暖真诚，符合中国传统文化。
            请严格按照JSON格式回复。`;
  }

  getMaxTokens(length) {
    // 根据要求的长度设置合适的 token 数量
    switch (length) {
      case 'short':
        return 100;
      case 'medium':
        return 200;
      case 'long':
        return 400;
      default:
        return 200;
    }
  }

  async continueDialog(messages) {
    console.log('Continuing dialog with messages:', messages);
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Dialog API Error Response:', errorData);
        throw new Error(errorData.error?.message || 'API 请求失败');
      }

      const data = await response.json();
      console.log('Dialog API Response:', {
        id: data.id,
        model: data.model,
        created: new Date(data.created * 1000).toISOString(),
        content: data.choices[0].message.content,
        usage: data.usage
      });
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Dialog API Error:', error);
      throw new Error('对话失败，请稍后重试');
    }
  }

  async continueDialogWithNewBlessings(messages) {
    console.log('Continuing dialog with messages:', messages);
    
    try {
      // 添加系统提示，要求生成新的祝福语
      const systemMessage = {
        role: 'system',
        content: `请根据用户的回答生成新的、更符合需求的祝福语。
                 请严格按照以下JSON格式回复：
                 {
                   "message": "对用户的回应",
                   "blessings": [
                     "新祝福语1",
                     "新祝福语2",
                     "新祝福语3",
                     "新祝福语4",
                     "新祝福语5"
                   ]
                 }`
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1000,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Dialog API Error Response:', errorData);
        throw new Error(errorData.error?.message || 'API 请求失败');
      }

      const data = await response.json();
      console.log('Dialog API Response:', {
        id: data.id,
        model: data.model,
        created: new Date(data.created * 1000).toISOString(),
        content: data.choices[0].message.content,
        usage: data.usage
      });
      
      // 解析JSON响应
      try {
        const parsedResponse = JSON.parse(data.choices[0].message.content);
        return {
          message: parsedResponse.message,
          blessings: parsedResponse.blessings?.slice(0, 5) || []
        };
      } catch (error) {
        console.error('JSON Parse Error:', error);
        return {
          message: data.choices[0].message.content,
          blessings: []
        };
      }
    } catch (error) {
      console.error('Dialog API Error:', error);
      throw new Error('对话失败，请稍后重试');
    }
  }
} 