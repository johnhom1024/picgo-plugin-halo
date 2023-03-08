import { PicGo } from 'picgo'
import qs from 'qs';
import cookie from 'cookie';
import FormData from 'form-data';
interface promptItem {
  name: string
  type: string
  default: string
  message: string
  required: boolean
}

interface UserConfig {
  haloUrl?: string
  username?: string
  password?: string
  // 上传所需要的cookie信息
  accessToken?: string
}

const PluginName = 'halo';
// 登陆的url
const loginUrl = '/login';
const uploadUrl = '/apis/api.console.halo.run/v1alpha1/attachments/upload';

// halo 生成UUID的函数
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 登陆请求的配置
const loginOptions = (haloUrl: string, username, password, xsrf: string): any => {
  const loginForm = {
    username,
    password,
    _csrf: xsrf
  }

  return {
    method: 'POST',
    url: haloUrl + loginUrl,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Cookie: `XSRF-TOKEN=${xsrf}; Path=/;`
    },
    data: qs.stringify(loginForm),
    // 返回响应的所有数据
    resolveWithFullResponse: true
  }
}

// 上传图片请求的配置
const uploadOptions = (haloUrl: string, accessToken: string, filename: string, fileBuffer: Buffer): any => {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename
  });
  form.append('policyName', 'default-policy');
  form.append('groupName', '');

  const formHeaders = form.getHeaders();

  return {
    method: 'POST',
    url: haloUrl + uploadUrl,
    data: form,
    headers: {
      Cookie: accessToken,
      ...formHeaders
    }
  }
}

// 登陆以获取accessToken
async function getAccessTokenByConfig(ctx: PicGo): Promise<string> {
  let accessToken = '';
  const userConfig: UserConfig = ctx.getConfig(`picBed.${PluginName}`) || {};
  if (!userConfig.haloUrl) {
    ctx.emit('notification', {
      title: '请先配置haloUrl',
      body: 'halo博客网址'
    })
    throw new Error('请先配置halo博客网址')
  }
  if (!userConfig.username) {
    ctx.emit('notification', {
      title: '请先配置username',
      body: 'halo用户名'
    })
    throw new Error('请先配置用户名')
  }
  if (!userConfig.password) {
    ctx.emit('notification', {
      title: '请先配置password',
      body: 'halo密码'
    })
    throw new Error('请先配置密码')
  }

  const haloUrl = userConfig.haloUrl
  const username = userConfig.username
  const password = userConfig.password

  const xsrf = randomUUID();

  const loginConfig = loginOptions(haloUrl, username, password, xsrf);
  try {
    const { status = 200, headers = {} } = await ctx.request(loginConfig) as any;
    console.log('----------johnhomLogDebug status', status === 200);
    if (status === 200) {
      // 这里headers['set-cookie']是一个数组，直接取第一个元素
      const setCookieArr = headers['set-cookie'];
      const setCookie = cookie.parse(setCookieArr[0]);
      /**
       * {
       *  SESSION: ****
       *  ....
       * }
       */

      const session = setCookie.SESSION;

      console.log('----------johnhomLogDebug session', session);
      accessToken = `SESSION=${session}; XSRF-TOKEN=${xsrf}`;
    }
  } catch (error) {
    const { response } = error;
    if (response) {
      const { data = '' } = response;
      ctx.emit('notification', {
        title: '登陆失败',
        body: data
      })

      throw new Error(data);
    }
  }

  return accessToken;
}

export = (ctx: PicGo) => {
  const config = (ctx): promptItem[] => {
    const userConfig = ctx.getConfig(`picBed.${PluginName}`) || {};

    const defaultHaloUrl = 'http://192.168.31.216:8090';
    const defaultUserName = 'admin';
    return [
      {
        name: 'haloUrl',
        type: 'input',
        default: userConfig.haloUrl || defaultHaloUrl,
        message: 'haloUrl不能为空',
        required: true
      },
      {
        name: 'username',
        type: 'input',
        default: userConfig.username || defaultUserName,
        message: 'username不能为空',
        required: true
      },
      {
        name: 'password',
        type: 'password',
        default: userConfig.password || '',
        message: 'password不能为空',
        required: true
      },
      {
        name: 'accessToken',
        type: 'input',
        default: userConfig.accessToken || '',
        message: '不需要配置（会自动填充），仅作为缓存使用',
        required: false
      }
    ]
  }

  const register = (): void => {
    ctx.helper.uploader.register(PluginName, {
      handle,
      config
    })
  }

  // 处理图片上传核心代码
  const handle = async (ctx): Promise<void> => {
    const userConfig = ctx.getConfig(`picBed.${PluginName}`) || {};
    let accessToken = userConfig.accessToken;
    try {
      // 如果没有存储accessToken，则请求登陆接口
      if (!accessToken) {
        accessToken = await getAccessTokenByConfig(ctx);
        ctx.saveConfig({
          [`picBed.${PluginName}.accessToken`]: accessToken
        });
      }
      const fileList = ctx.output;
      for (const i in fileList) {
        const file = fileList[i];
        let fileBuffer = file.buffer;
        if (!fileBuffer && file.base64Image) {
          fileBuffer = Buffer.from(file.base64Image, 'base64')
        }
        const haloUrl = userConfig.haloUrl;
        const filename = file.fileName;
        const uploadConfig = uploadOptions(haloUrl, accessToken, filename, fileBuffer)
        // 请求上传接口
        const uploadBody = await ctx.request(uploadConfig);
        const { spec = {} } = uploadBody;
        const { displayName = '' } = spec;
        file.imgUrl = `/upload/${displayName}`;
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  return {
    uploader: PluginName,
    register
  }
}
