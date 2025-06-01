const axios = require('axios');

const url = 'https://duckduckgo.com/';
const headers = {
    'dnt': '1',
    'accept-encoding': 'gzip, deflate, sdch',
    'x-requested-with': 'XMLHttpRequest',
    'accept-language': 'en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'referer': 'https://duckduckgo.com/',
    'authority': 'duckduckgo.com',
};
const max_iter = 2;
const max_retries = 2;
const params_template = {
    l: "wt-wt",
    o: "json",
    q: null,
    vqd: null,
    f: ",,,",
    p: null
};

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

async function getToken(keywords) {

    let token = null;
    try {
        let res = await axios.get(url, {
            params: {
                q: keywords
            }
        })

        token = res.data.match(/vqd=([\d-]+)\&/)[1]

    } catch (error) {
        console.error(error)
    }

    return new Promise((resolve, reject) => {
        if (!token)
            reject('Failed to get token')
        resolve(token)
    })

}

async function image_search({ query, moderate, retries, iterations }) {

    let reqUrl = url + 'i.js';
    let keywords = query
    let p = moderate ? 1 : -1;      // by default moderate false
    let attempt = 0;
    if (!retries) retries = max_retries; // default to max if none provided
    if (!iterations) iterations = max_iter; // default to max if none provided

    let results = [];

    try {

        let token = await getToken(keywords);

        let params = {
            "l": "wt-wt",
            "o": "json",
            "q": keywords,
            "vqd": token,
            "f": ",,,",
            "p": "" + (p)
        }

        let data = null;
        let itr = 0;


        while (itr < iterations) {

            while (true) {
                try {

                    let response = await axios.get(reqUrl, {
                        params,
                        headers
                    })

                    data = response.data;
                    if (!data.results) throw "No results";
                    break;

                } catch (error) {
                    console.error(error)
                    attempt += 1;
                    if (attempt > retries) {
                        return new Promise((resolve, reject) => {
                            resolve(results)
                        });
                    }
                    await sleep(5000);
                    continue;
                }

            }

            results = [...results, ...data.results]
            if (!data.next) {
                return new Promise((resolve, reject) => {
                    resolve(results)
                });
            }
            reqUrl = url + data["next"];
            itr += 1;
            attempt = 0;
        }

    } catch (error) {
        console.error(error);
    }
    return results;

}


async function getImageLinks(query) {
    try {
        const results = await image_search({ query });

        const filtered = results.filter(img =>
            img.width >= 1024 && img.height >= 768
        );

        const imageLinks = filtered.map(img => img.image);

        return imageLinks;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}