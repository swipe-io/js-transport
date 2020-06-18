const isFormData = (val) => (typeof FormData !== 'undefined') && (val instanceof FormData)

class JSONRPCTransport {
    config = {
        method: 'POST',
        timeout: 3000 // 30s
    };
    apiHost = null;
    constructor(apiHost, config = null) {
        if (!apiHost) {
            throw new Error('JSONRPCTransport constructor is called without apiHost')
        }
        if (config !== null) {
            this.config = { ...this.config, ...config }
        }
        this.apiHost = apiHost
    }
    doRequest(requestData) {
        console.log('Requesting ', requestData, ' from', this.apiHost)
        return Promise.resolve(requestData)
    }
}

export class XHRTransport extends JSONRPCTransport {
    requestHeaders = {
        'Content-Type': 'application/json;charset=utf-8'
    };
    constructor(apiHost, config = null) {
        super(apiHost, config)
    }
    doRequest([requestData]) {
        if (!requestData) {
            throw new Error('Empty request')
        }
        const requestHeaders = { ... this.requestHeaders }
        if (isFormData(requestData)) {
            delete requestHeaders['Content-Type']
        }
        let isCancelled = false
        let request = new XMLHttpRequest()
        const reqPromise = new Promise((resolve, reject)=>{
            request.open(this.config.method.toUpperCase(), this.apiHost, true)
            request.timeout = this.config.timeout
            request.onreadystatechange = () => {
                if (isCancelled) {
                    reject('Cancelled')
                }
                if (!request || request.readyState !== 4) {
                    return
                }
                let responseData
                try {
                    responseData = JSON.parse(request.response)
                } catch (e) {
                    reject('failed to parse JSON from request ', requestData, ' at ', this.apiHost)
                }
                resolve(responseData)
                request = null
            }
            const handleFail = (reason) => {
                if (!request) {
                    return
                }
                reject(reason)
                request = null
            }
            request.onabort = () => handleFail('Request aborted')
            request.onerror = () => handleFail('Network failure')
            request.ontimeout = () => handleFail('Request timeout')
            Object.keys(requestHeaders).forEach(header => {
                request.setRequestHeader(header, requestHeaders[header])
            })
            // Send the request
            request.send(JSON.stringify(requestData))
        })
        reqPromise.cancel = () => {
            isCancelled = true
            request.abort()
        }
        return reqPromise
    }
}
