### 一、简介

SuperMap.Web.Adapter 是一款基于SuperMap iClient 6R(2012) for JavaScript 和第三方地图JavaScript开发的适配器工具，此处面对的是以第三方地图JavaScript为基础，并且又想加入SuperMap iServer强大的功能的用户。现第三方API支持百度、天地图、Google、Leaflet和ArcGIS。

### 二、特性描述

1.可以将iserver的地图服务叠加到第三方API的地图上

2.可以将使用iserve做出的专题图添加到第三方API的地图上

3.可以将通过iserver查询到的Geometry数据转换成对应的第三方API的Geometry并且添加到地图上

4.在第三方API的地图上可以使用iserver的所有分析功能。


### 三、使用说明

提供了针对百度、天地图、Google、Leaflet和ArcGIS的不同接口，详见：
1、Adapter for Baidu help.docx
2、Adapter for Tianditu help.docx
3、Adapter for Google help.docx
4、Adapter for Leaflet help.docx
5、Adapter for ArcGIS help.docx

### 四、许可授权

详见“LICENSE.txt”。

### 五、效果展示

1、如下是在百度地图上面叠加了全国的等级符号专题图

![original_THmC_4b6f000174941190](http://fmn.rrimg.com/fmn060/20130516/1450/large_xrvX_4aee0000693d118f.jpg)

2、如下是在天地图上通过几何查询iserver上的各国首都

![original_THmC_4b6f000174941190](http://fmn.rrimg.com/fmn063/20130515/1520/large_AkWW_252300003898118c.jpg)

3、如下是在Google地图上叠加了全国的省份的分段专题图

![original_THmC_4b6f000174941190](http://fmn.rrimg.com/fmn062/20130531/1430/large_g3ov_44640000400d1191.jpg)

4、如下是使用Leaflet的API出的Openstreet的地图，叠加了全世界的各国首都的矩阵标签专题图
![original_THmC_4b6f000174941190](http://fmn.rrimg.com/fmn064/20130531/1430/large_YPm1_53fd00000b4d1190.jpg)

5、如下是在ArcGIS地图上面叠加了全国省份的单值专题图
![original_THmC_4b6f000174941190](http://fmn.rrimg.com/fmn061/20130531/1435/large_kS4b_721500003933125d.jpg)




