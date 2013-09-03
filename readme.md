### 一、简介

SuperMap.Web.iConnector 是一款基于SuperMap iClient for JavaScript 和第三方地图JavaScript开发的适配器工具，此处面对的是以第三方地图JavaScript为基础，并且又想加入SuperMap iServer强大的功能的用户。现第三方API支持百度、天地图、Google、Leaflet和ArcGIS。

### 二、特性描述

1.可以将iserver的地图服务叠加到第三方API的地图上

2.可以将使用iserve做出的专题图添加到第三方API的地图上

3.可以将通过iserver查询到的Geometry数据转换成对应的第三方API的Geometry并且添加到地图上

4.在第三方API的地图上可以使用iserver的所有分析功能。


### 三、使用说明

提供了针对百度、天地图、Google、Leaflet和ArcGIS的不同接口，详见：
1、iConnector for Baidu help.docx
2、iConnector for Tianditu help.docx
3、iConnector for Google help.docx
4、iConnector for Leaflet help.docx
5、iConnector for ArcGIS help.docx
由于范例访问的服务器非本地服务器，所以可以直接运行范例，范例中使用的服务器仅支持范例使用。

### 四、许可授权

详见“LICENSE.txt”。

### 五、效果展示

1、如下是在百度地图上面叠加了全国的等级符号专题图

![original_THmC_4b6f000174941190](images/overlyingThemeGraduatedSymbolToBaidu.jpg)

2、如下是在天地图上通过几何查询iserver上的各国首都

![original_THmC_4b6f000174941190](images/transferSuperMapPoint_Tianditu.jpg)

3、如下是在Google地图上叠加了全国的省份的分段专题图

![original_THmC_4b6f000174941190](images/overlyingThemeRangeToGoogle.jpg)

4、如下是使用Leaflet的API出的Openstreet的地图，叠加了全世界的各国首都的矩阵标签专题图
![original_THmC_4b6f000174941190](images/overlyingThemeLabelToOpenStreetMap.jpg)

5、如下是在ArcGIS地图上面叠加了全国省份的单值专题图
![original_THmC_4b6f000174941190](images/overlyingThemeUniqueToArcGIS.jpg)

6、如下是在天地图上面叠加了京津的统计专题图
![original_THmC_4b6f000174941190](images/overlyingThemeGraphToTianditu.jpg)

7、如下是在天地图上面进行缓冲区分析
![original_THmC_4b6f000174941190](images/bufferQuery_Tianditu.jpg)




