# picgo-plugin-halo

为[PicGo](https://github.com/Molunerfinn/PicGo)开发的一款插件，一个可以把[halo](https://github.com/halo-dev/halo)博客系统当作图床上传图片的`picgo`插件。

![image](https://github.com/johnhom1024/picgo-plugin-halo/raw/main/example/setting.jpg)

## 在线安装

在`PicGo`app的**插件设置**中，搜索**halo**，选择**picgo-plugin-halo**，安装，然后重启应用即可。

![image](https://github.com/johnhom1024/picgo-plugin-halo/raw/main/example/install.jpg)

## 配置

在**图床设置**中找到`halo`，然后配置好自己的`haloUrl`，`username`，`password`这三个字段保存即可。

## 原理

在使用`PicGo`上传时插件会根据填写的配置信息，调用登陆接口，然后根据生成的`accessToken`字段保存到配置文件中，最后调用上传接口来上传附件。

上传附件成功之后，粘贴板里的内容会变成：

```
/upload/<附件的文件名>.<文件后缀>
```

之后你可以直接在halo的文章编辑器中粘贴以展示该附件。如下图：

![image](https://github.com/johnhom1024/picgo-plugin-halo/raw/main/example/use.jpg)

## 兼容情况

支持`halo@2.3.0`版本，其他的版本暂未测试。（因为本人只部署了这个版本+_=）

## 致谢

[picgo-plugin-halo-uploader](https://github.com/foraixh/picgo-plugin-halo-uploader)