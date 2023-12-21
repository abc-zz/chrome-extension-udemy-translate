// @ts-nocheck 
import axios from 'axios';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import qs from 'qs';
import md5 from 'md5';
import { v4 as uuidv4 } from 'uuid';
import translate from 'google-translate-open-api';

const getItem = (key: string) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (value) => {
            resolve(value[key])
        })
    })
}

export const deeplSupportSource = [
    "DE",
    "EN",
    "FR",
    "IT",
    "JA",
    "ES",
    "NL",
    "PL",
    "PT",
    "RU",
    "ZH",
]

export const cloudflareSupportSource = [
    "ar",
    "de",
    "en",
    "fr",
    "ja",
    "es",
    "pt",
    "ru",
    "zh",
    "hi",
]


export const youdaoRequset = async (text: string) => {
    try {
        console.log(`youdao ...`, text)
        let id = await getItem('youdao_id')
        let key = await getItem('youdao_key')
        let salt = await new Date().getTime();
        let language = await getItem('language');
        let from = await getItem('origin_lang');

        getItem('youdao_id').then((value: any) => {
            id = value
        });
   
        const data = {
            q: text,
            appKey: id,
            salt: salt,
            from: from,
            to: language === 'zh-cn' ? 'zh-CHS' : language,
            sign: md5(id + text + salt + key),
        };

        const options = {
            adapter: fetchAdapter,
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            data: qs.stringify(data),
            url: 'https://openapi.youdao.com/api',
        };

        const res = await axios.request(options)
  
        const [origin, translate] = [String.prototype.toLowerCase(text), res?.data?.translation?.[0]];
        return { origin, translate: translate ? translate : '翻译失败' };
    } catch (err) {
        console.log(`youdao id`, err)
    }

};

/*
调用第三方谷歌翻译api
*/
export const googleTranslate = async (text: string | string[]) => {
    const language = await getItem('language');
    return translate(text, {
        tld: 'cn',
        to: language === 'zh' ? 'zh-CN' : language as string,
        browers: true,
    });
};

/*
调用谷歌翻译官方Rest 
*/
export const googleTranRestRequest = async (text: string | string[]) => {
    let language = await getItem('language') as string;
    let from = await getItem('origin_lang');
    let key = '';

    await getItem('google_key').then((value: any) => {
        key = value
    });

    const data = {
        q: text,
        target: 'zh-cn' ? 'zh' : language.toLowerCase(),
        "format": "text"
    };
    
    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer',
            'X-goog-api-key': key,
            'Content-Type': 'application/json; charset=utf-8',
         },
        data: data,
        url: 'https://translation.googleapis.com/language/translate/v2',
    };
    console.log(options);
    let res = await axios.request(options);
    
    if (res.status === 200) {
        const translatedText =
                res?.data?.data?.translations &&
                res?.data?.data?.translations?.[0] &&
                res?.data?.data?.translations?.[0]?.translatedText
                ? res?.data?.data?.translations?.[0]?.translatedText
                : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

export const baiduRequest = async (text: string) => {
    let key = await getItem('baidu_key');
    let id = await getItem('baidu_id');
    let salt = await new Date().getTime();
    let language = await getItem('language');
    let from = await getItem('origin_lang');

    getItem('baidu_id').then((value: any) => {
        id = value
    });
    getItem('baidu_key').then((value: any) => {
        key = value
    });

    const params = {
        q: text,
        appid: id,
        salt: salt,
        from: from,
        to: language === 'zh-cn' ? 'zh' : language,
        sign: md5(id + text + salt + key),
    };
   
    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(params),
        url: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
    };

    let res = await axios.request(options);
    const [ src, dst ] = [res?.data?.trans_result?.[0]?.src, res?.data?.trans_result?.[0]?.dst];

    if (res.status === 200) {
        return {
            origin: text,
            translate: dst ? dst : '翻译失败',
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
/*
    if (dst !== '' && dst !== ' ' && dst !== undefined) {
        return {
            origin: src,
            translate: dst ? dst : '翻译失败',
        };
    }
*/

};

export const yandexRequest = async (text: string) => {
    let key = null;
    getItem('yandex_key').then((value: any) => {
        key = value
    });


    let language = await getItem('language');
    let from = await getItem('origin_lang');
    from = from === 'auto' ? '' : from + '-';
    let lang = from + (language === 'zh-cn' ? 'zh' : language as string)
    const params = {
        lang: lang,
        text,
        key,
    };

    const opt = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(params),
        url: 'https://translate.yandex.net/api/v1.5/tr.json/translate',
    };

    let res = await axios.request(opt);

    if (res.data.code === 200) {
        return {
            origin: text,
            translate: res?.data?.text?.[0],
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

export const deepLRequest = async (text: string) => {
    let key = await getItem('deepl_key');
    let language = await getItem('language') as string;
    let from = await getItem('origin_lang');
    //let key = '';

    getItem('deepl_key').then((value: any) => {
        key = value
    });

    const data = {
        text: [text],
        source_lang: from,
        target_lang: language === 'zh-cn' ? 'ZH' : language.toUpperCase(),
    };
    if (
        deeplSupportSource.indexOf(String.prototype.toUpperCase.call(from)) === -1
    ) {
        delete data.source_lang;
    }
    console.log(data);

    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'DeepL-Auth-Key '+key
                },
        data: data,
        url: 'https://api-free.deepl.com/v2/translate',  //https://api.deepl.com/v2/translate
    };

    let res = await axios.request(options).catch((error: AxiosError) => {
        if (error instanceof Error) {
           console.log("Error from Deepl, details: ",
            error
          );
        }
      });
    
    if (res !== undefined && res.status === 200) {
        const translatedText =
            res?.data?.translations &&
                res?.data?.translations?.[0] &&
                res?.data?.translations?.[0]?.text
                ? res?.data?.translations?.[0]?.text
                : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

// @api: https://a-translator.royli.dev/
// @reference: https://www.v2ex.com/t/730356
// @wiki: https://www.notion.so/geekdada/8119484f98c74e989c0837f89e38a295?v=f57df852e6194f36bc5a0ea9cfc6c4a0
export const a_translatorRequest = async (text: string) => {
    let language = await getItem('language') as string;
    let from = await getItem('origin_lang');
    let key = '';

    await getItem('a_translater_key').then((value: any) => {
        key = value
    });

    const data = {
        auth_key: key,
        text,
        source_lang: from,
        target_lang: 'zh-cn' ? 'ZH' : language.toUpperCase(),
    };

    if (
        deeplSupportSource.indexOf(String.prototype.toUpperCase.call(from)) === -1
    ) {
        delete data.source_lang;
    }

    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(data),
        url: 'https://a-translator-api.nerdynerd.org/v2/translate',
    };

    let res = await axios.request(options);
    
    if (res.status === 200) {
        const translatedText =
            res?.data?.translations &&
                res?.data?.translations?.[0] &&
                res?.data?.translations?.[0]?.text
                ? res?.data?.translations?.[0]?.text
                : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

export const caiyunRequest = async (text: string) => {
    let language = await getItem('language');
    let from = await getItem('origin_lang');
    let key = '';

    getItem('caiyun_key').then((value: any) => {
        key = value
    });
    language = language === 'zh-cn' ? 'zh' : language;
    const data = {
        source: text,
        trans_type: from + '2' + language,
        request_id: 'demo',
        detect: true,
    };

    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-authorization': 'token ' + key,
        },
        data: data,
        url: 'http://api.interpreter.caiyunai.com/v1/translator',
    };
    let res = await axios.request(options);

    if (res.status === 200) {
        const translatedText = res?.data?.target ? res.data.target : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

export const msRequest = async (text: string) => {
    let language = await getItem('language');
    let from = await getItem('origin_lang');
    let key = '';
    let region = '';

    await getItem('microsoftTranslate_key').then((value: any) => {
        key = value
    });
    await getItem('microsoftTranslate_region').then((value: any) => {
        region = value
    });
    language = language === 'zh-cn' ? 'zh-Hans' : language;
    const options = {
        adapter: fetchAdapter,
        baseURL: 'https://api.cognitive.microsofttranslator.com',
        url: '/translate',
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': region,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString(),
        },
        params: {
            'api-version': '3.0',
            from: from == 'auto' ? 'en' : from,
            to: `${language}`,
        },
        data: [
            {
                text,
            },
        ],
        responseType: 'json',
    } as any;
    //console.log(options);

    let res = await axios.request(options).catch((error: AxiosError) => {
        if (error instanceof Error) {
           console.log("Error from Microsoft Azure, details: ",
            error
          );
        }
      });

    if (res !== undefined && res.status === 200) {
        const translatedText = res?.data?.[0]?.translations
            ? res?.data?.[0]?.translations?.[0]
            : '翻译失败';
        console.log(translatedText);
        return {
            origin: text,
            translate: translatedText['text'],
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};


export const cloudflareRequest = async (text: string) => {
    let id = await getItem('cloudflare_id');
    let token = await getItem('cloudflare_token');
    let language = await getItem('language') as string;
    let from = await getItem('origin_lang');

    getItem('cloudflaretrans_id').then((value: any) => {
        id = value
    });

    getItem('cloudflaretrans_token').then((value: any) => {
        token = value
    });

    const data = {
        text,
        source_lang: from,
        target_lang: language === 'zh-cn' ? 'zh' : language.toLowerCase(),
    };
    if (
        cloudflareSupportSource.indexOf(String.prototype.toLowerCase.call(from)) === -1
    ) {
        data.source_lang='en';
    }
    console.log(data);

    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+token},
        data: data,
        url: 'https://api.cloudflare.com/client/v4/accounts/'+id+'/ai/run/@cf/meta/m2m100-1.2b',  
    };

    let res = await axios.request(options).catch((error: AxiosError) => {
        if (error instanceof Error) {
           console.log("Error from Cloudflare AI, details: ",
            error
          );
        }
      });
    
    if (res !== undefined && res.status === 200) {
        const translatedText =
                res?.data?.result &&
                res?.data?.success &&
                res?.data?.success === true &&
                res?.data?.result?.translated_text 
                ? res?.data?.result?.translated_text
                : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};

export const openaiRequest = async (text: string) => {
    let key = await getItem('openai_key');
    let model = await getItem('openai_model');
    let url = await getItem('openai_url');
    let language = await getItem('language') as string;
    let from = await getItem('origin_lang');
    //let key = '';

    getItem('openai_key').then((value: any) => {
        key = value
    });
    getItem('openai_model').then((value: any) => {
        model = value
    });
    getItem('openai_url').then((value: any) => {
        url = value
    });

    language= language === 'zh-cn' ? '翻译' : language.toLowerCase()
    const content = language + ":" + text;
     const data = {
        model,
        'messages': [{
            "role": "user",
            'content': content
        }],
        'temperature': 0.7,
    };

    console.log(data);

    const options = {
        adapter: fetchAdapter,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        headers: { 'Authorization': 'Bearer '+key},
        data: data,
        url,  
    };

    let res = await axios.request(options).catch((error: AxiosError) => {
        if (error instanceof Error) {
           console.log("Error from OpenAI, details: ",
            error
          );
        }
      });
    
    if (res !== undefined && res.status === 200) {
        const translatedText =
                res?.data?.choices &&
                res?.data?.choices?.[0] &&
                res?.data?.choices?.[0]?.message &&
                res?.data?.choices?.[0]?.message?.content 
                ? res?.data?.choices?.[0]?.message?.content 
                : '翻译失败';
        return {
            origin: text,
            translate: translatedText,
        };
    } else {
        console.log(res);
        return {
            origin: text,
            translate: '接口配置错误',
        };
    }
};