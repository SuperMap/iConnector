//判定一下是否存在了SuperMap.Web，如果没有则初始化一个
if(SuperMap.Web == undefined )
{
    SuperMap.Web = new Object();
}
//判定一下是否存在了SuperMap.Web.iConnector，如果没有则初始化一个
if(SuperMap.Web.iConnector == undefined )
{
    SuperMap.Web.iConnector = new Object();
}
/**
 * Class: SuperMap.Web.iConnector.AMap
 * AMap适配器类
 */
SuperMap.Web.iConnector.AMap = function(){

};

/**
 *  APIMethod: getLayer
 *  创建AMap的扩展图层，这里的图层中切片的来源为iserver服务器（只能是3857的地图）
 *
 *  Parameters:
 *  url - {String}  地图服务的url地址，如：“http://localhost:8090/iserver/services/map-china400/rest/maps/China”
 *  options - {Object} 可选的参数
 *
 *  Allowed options properties:
 *  transparent - {Boolean} 设置切片是否透明，默认为true
 *  cacheEnabled - {Boolean} 设置是否使用缓存，默认为false
 *  layersID - {String} 设置临时图层的id，一般用于专题图的叠加使用
 *
 *  Returns:
 *  {Object} 返回AMap地图的扩展图层对象
 */
SuperMap.Web.iConnector.AMap.getLayer = function(url,options){
    if(url == undefined)
    {
        return;
    }
    var tileLayer = new AMap.TileLayer({
        getTileUrl:getTileUrl
    });
    var layerUrl = url + "/image.png?redirect=false&width=256&height=256";

    //切片是否透明
    var transparent = true;
    if(options && options.transparent !=undefined)
    {
        transparent = options.transparent;
    }
    layerUrl += "&transparent=" + transparent;

    //是否使用缓存
    var cacheEnabled = false;
    if(options && options.cacheEnabled !=undefined)
    {
        cacheEnabled = options.cacheEnabled;
    }
    layerUrl += "&cacheEnabled=" + cacheEnabled;

    //如果有layersID，则是在使用专题图
    if(options && options.layersID !=undefined)
    {
        layerUrl += "&layersID=" +options.layersID;
    }
    //如果有projection，目前只支持4326或者3857的地图。
    var projection="3857";
    if(options&&options.projection){
        if(options.projection==="4326"){
            projection="4326";
        }
    }
    //计算分辨率和比例尺
    var resLen = 17;
    var resStart = 0;
    var resolutions4326 = [];
    var resolutions3857 = [];
    var dpi = 95.99999999999984;
    var scales4326 = [];
    var scales3857 = [];
    for(var i=resStart;i<=resLen;i++){
        var res4326 = 1.40625/Math.pow(2,i);
        resolutions4326.push(res4326);

        var scale4326 = 0.0254*360/dpi/res4326/Math.PI/2/6378137;
        scales4326.push(scale4326);
    }

    tileLayer.scales4326 = scales4326;

    for(var i=resStart;i<=resLen;i++){
        var res3857 = 156543.0339/Math.pow(2,i);
        resolutions3857.push(res3857);

        var scale3857 = 0.0254/dpi/res3857;
        scales3857.push(scale3857);
    }
    tileLayer.scales3857 = scales3857;

    function getTileUrl(x, y, zoom){
        var tileUrl = layerUrl;
        if(projection=="4326") {
            tileUrl +="&scale=" +tileLayer.scales4326[zoom];
            tileUrl += "&prjCoordSys={\"epsgCode\":4326}";
            var orginX = -180;var orginY = 90;
            //使用center来出图 （也可以使用bounds出图）
            var centerX = orginX + resolutions4326[zoom]   *x *256  + resolutions4326[zoom]*128;
            var centerY = orginY-( resolutions4326[zoom]   *y *256  + resolutions4326[zoom]*128)       ;
            tileUrl+= "&center={\"x\":" + centerX+",\"y\":" + centerY + "}" ;
            return tileUrl;
        }
        else if(projection=="3857"){
            var po = Math.pow(2,zoom);
            x = x;
            y = y;
            x-=po/2;
            y=po/2-y-1;
            //使用bounds出图（也可以使用center）
            var left = x*256*resolutions3857 [zoom];
            var bottom = y*256*resolutions3857[zoom];
            var right = (x + 1)*256*resolutions3857[zoom];
            var top = (y + 1)*256*resolutions3857[zoom];
            //将bounds组合到url里面
            tileUrl+= "&viewBounds=" +"{\"leftBottom\" : {\"x\":" + left +",\"y\":" + bottom +"},\"rightTop\" : {\"x\":" + right +",\"y\":" +top + "}}";

            tileUrl +="&scale=" +scales3857[zoom];
            tileUrl += "&prjCoordSys={\"epsgCode\":3857}";
        }
        return tileUrl;
    }
    return tileLayer;
}
/**
 * APIMethod: transferPoint
 * 将其他坐标系下的点转换为高德地图的点。
 * Parameters:
 * points - {Array} 点数组，支持四种形式的点，如例子所示。
 * projection - {SuperMap.Projection} 待转换点的投影系（数组里面的所有点投影系都必须是统一的），默认为4326.
 *
 * Examples:
 * (start code)
 * var points = [
 *                          {x:116.1,y:38.9},
 *                          {x:114.1,y:34.1}
 *                          ];
 * var points = [
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          ];
 * var points = [
 *                          new SuperMap.LonLat(116.1,38.9),
 *                          new SuperMap.LonLat(116.1,38.4)
 *                          ];
 * var points = [
 *                          new AMap.LngLat(116.404, 39.915),
 *                         new AMap.LngLat(39.9,116.35)
 *                          ];
 *  (end)
 *  Returns:
 *  {Array} Amap.LatLng对象的数组
 */
SuperMap.Web.iConnector.AMap.transferPoint = function(array,projection){

    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var pro = projection || new SuperMap.Projection("EPSG:4326");
        var points = []
        //分几种不同的情况，现在只提供两种
        for(var i = 0;i<array.length;i++)
        {
            var smPoint;
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.LonLat")
            {
                //首先转换为标准4326的坐标
                smPoint =  SuperMap.Projection.transform(new SuperMap.Geometry.Point(array[i].lon,array[i].lat),pro,new SuperMap.Projection("EPSG:4326"));
            }
            //支持{x:118,y:38}和SuperMap.Geometry.Point的形式，因为都存在x和y
            else if(array[i].x != undefined && array[i].y != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SuperMap.Projection.transform(new SuperMap.Geometry.Point(array[i].x,array[i].y),projection,new SuperMap.Projection("EPSG:4326"));

            }

            //支持AMap.LngLat的形式
            else if(array[i].getLng != undefined && array[i].getLat != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SuperMap.Projection.transform(new SuperMap.Geometry.Point(array[i].getLng(),array[i].getLat()),projection,new SuperMap.Projection("EPSG:4326"));

            }
            var point =new AMap.LngLat(smPoint.x,smPoint.y);
            points.push(point);
        }
        return  points;
    }
}
/**
 * APIMethod: transferLine
 * 将其他坐标系下的线数组转换为高德地图支持的线数组
 * Parameters:
 * lines - {Array} 线数组，支持两种形式。
 * projection - {SuperMap.Projection} 需要转换的线的坐标系。
 *
 * Examples:
 * (start code)
 * var lines = [new SuperMap.Geometry.LineString(
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          )];
 * var lines = [new   AMap.Polyline(
 *                           new AMap.LngLat(116.3 ,39.9)
 *                           new AMap.LngLat(116.3 ,38.9)
 *                          )];
 * (end)
 * @returns {Array} 返回AMap.Polyline对象的数组
 */
SuperMap.Web.iConnector.AMap.transferLine = function(array,projection){
    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var pro = projection || new SuperMap.Projection("EPSG:4326");
        var lines = [];
        //分几种不同的情况，现在只提供两种
        for(var i = 0;i<array.length;i++)
        {
            var line;
            //支持supermap的LineString
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.Geometry.LineString")
            {
                var points = SuperMap.Web.iConnector.AMap.transferPoint(array[i].components,pro);
                line = new AMap.Polyline({path:points,strokeColor:"#87CEFF"});
            }
            //支持AMap.Polyline的对象
            else if(array[i].constructor == AMap.Polyline)
            {
                var points = SuperMap.Web.iConnector.AMap.transferPoint(array[i].getLngLats(),pro);
                line = new  AMap.Polyline({path:points,strokeColor:"#87CEFF"});
            }
            lines.push(line);
        }
        return lines;
    }
}
/**
 * APIMethod: transferPolygon
 * 将其他坐标系下的多边形数组转换为高德地图支持的多边形数组
 *
 * Parameters:
 * polygons - {Array} 多边形数组，支持两种形式：
 * projection - {SuperMap.Projection} 需要转换的多边形的坐标系
 *
 * Examples:
 * (start code)
 * var polygons = [new SuperMap.Geometry.Polygon(
 *                                [new SuperMap.Geometry.LinearRing(
 *                                    new SuperMap.Geometry.Point(116.3786889372559,39.90762965106183),
 *                                    new SuperMap.Geometry.Point(116.38632786853032,39.90795884517671),
 *                                    new SuperMap.Geometry.Point(116.38534009082035,39.897432133833574),
 *                                    new SuperMap.Geometry.Point(116.37624058825688,39.89789300648029)
 *                                  )
 *                           ]
 *                        )];
 * var polygons = [ new AMap.Polygon(
 *                                   new AMap.LngLat(116.3786889372559,39.90762965106183),
 *                                   new AMap.LngLat(116.38632786853032,39.90795884517671),
 *                                  new AMap.LngLat(116.38534009082035,39.897432133833574),
 *                                  new AMap.LngLat(116.37624058825688,39.89789300648029)
 *                          )];
 *  (end)
 *
 *  Returns:
 *  {Array} 返回AMap.Polygon对象的数组
 */
SuperMap.Web.iConnector.AMap.transferPolygon = function(array,projection){
    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var pro = projection || new SuperMap.Projection("EPSG:4326");
        var polygons = [];
        //分几种不同的情况，现在只提供两种
        for(var i = 0;i<array.length;i++)
        {
            var polygon;
            //支持supermap的Polygon
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.Geometry.Polygon")
            {
                var points = SuperMap.Web.iConnector.AMap.transferPoint(array[i].getVertices(false),pro);
                polygon = new AMap.Polygon({path:points, fillColor:"#87CEFF"});
            }

            //支持AMap.Polygon的对象
            else if(array[i].constructor  == AMap.Polygon)
            {
                var points = SuperMap.Web.iConnector.AMap.transferPoint(array[i].getLngLats(),pro);
                polygon = new AMap.Polygon({path:points,strokeColor:"#87CEFF"});
            }

            polygons.push(polygon);
        }
        return polygons;
    }
}

