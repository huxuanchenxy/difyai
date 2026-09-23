export function getApiUrl(urlPart:string)
{
  let fullUrl = ''

  if(import.meta.env.VITE_APP_SERVER_HOST)
  {
    fullUrl = `${import.meta.env.VITE_APP_SERVER_HOST}`
  }
  else
  {
    fullUrl = `${window.location.protocol}//${window.location.hostname}`
  }


  if(import.meta.env.VITE_APP_SERVER_PORT)
  {
    fullUrl += `:${import.meta.env.VITE_APP_SERVER_PORT}`
  }

  return `${fullUrl}/${urlPart}`
}


export function getIcApiUrl(urlPart:string)
{
  let fullUrl = ''

  if(import.meta.env.VITE_APP_IC_HOST)
  {
    fullUrl = `${window.location.protocol}//${import.meta.env.VITE_APP_IC_HOST}`
  }
  else
  {
    fullUrl = `${window.location.protocol}//${window.location.hostname}`
  }


  if(import.meta.env.VITE_APP_IC_PORT)
  {
    fullUrl += `:${import.meta.env.VITE_APP_IC_PORT}`
  }

  return `${fullUrl}/${urlPart}`
}


export function getApiUrl2(urlPart:string)
{
  let fullUrl = ''

  if(import.meta.env.VITE_APP_API_Host)
  {
    fullUrl = `${import.meta.env.VITE_APP_API_Host}`
  }
  else
  {
    fullUrl = `${window.location.protocol}//${window.location.hostname}`
  }


  if(!import.meta.env.VITE_APP_API_Host && import.meta.env.VITE_APP_API_Port)
  {
    fullUrl += `:${import.meta.env.VITE_APP_API_Port}`
  }

  return `${fullUrl}/${urlPart}`
}


export function getWsUrl(urlPart:string)
{
  let fullUrl = ''

  if(import.meta.env.VITE_APP_WS_HOST)
  {
    fullUrl = `ws://${import.meta.env.VITE_APP_WS_HOST}`
  }
  else
  {
    fullUrl = `ws://${window.location.hostname}`
  }


  if(import.meta.env.VITE_APP_WS_PORT)
  {
    fullUrl += `:${import.meta.env.VITE_APP_WS_PORT}`
  }
  console.log(`fullwsUrl:${fullUrl}/${urlPart}`)
  return `${fullUrl}/${urlPart}`
}
