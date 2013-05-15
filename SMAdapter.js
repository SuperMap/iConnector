/**
 * Created with JetBrains WebStorm.
 * User: liuyayun
 * Date: 13-5-7
 * Time: 下午1:50
 * To change this template use File | Settings | File Templates.
 */
/**
 * Class:
 * 适配器类
 * @constructor
 */
SMAdapter=function(){

}

/**
 * Method:
 * 加载外部脚本，此处用于发送服务请求
 * @param xyUrl 请求地址
 * @param callback 回调函数
 */
SMAdapter.load_script = function(xyUrl, callback){
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = xyUrl;
    //借鉴了jQuery的script跨域方法
    script.onload = script.onreadystatechange = function(){
        if((!this.readyState || this.readyState === "loaded" || this.readyState === "complete")){
            callback && callback();
            // Handle memory leak in IE
            script.onload = script.onreadystatechange = null;
            if ( head && script.parentNode ) {
                head.removeChild( script );
            }
        }
    };
    // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
    head.insertBefore( script, head.firstChild );
}
/**
 * Property:
 * 记录向百度服务器点坐标转换请求次数，用于服务器处理完成后定位回调函数
 * @type {number} 每请求一次服务器，会自动累加
 */
SMAdapter.eventsCounts = 0;
/**
 * Method:
 * 向百度服务器发送坐标转换请求，一次性最多支持20个点（百度服务器限制的）
 * @param points {Array}百度点BMap.Point数组
 * @param type  {Number} 0代表GPS坐标转百度坐标；2代表google坐标转百度坐标
 * @param id 唯一标示第几批点数组，对应了
 */
SMAdapter.transMore = function(points,type,id){
    var xyUrl = "http://api.map.baidu.com/ag/coord/convert?from=" + type + "&to=4&mode=1";
    var xs = [];
    var ys = [];
    var maxCnt = 20;//每次发送的最大个数，百度服务器一次性最多支持20个点的转换
    var send = function(){
        //一直累加，保证每一次请求后回调函数方便定位
        SMAdapter.eventsCounts++;
        var url = xyUrl + "&x=" + xs.join(",") + "&y=" + ys.join(",") + "&callback=SMAdapter.callbackFunction" + SMAdapter.eventsCounts;
        //这里的SMAdapter.eventsCounts肯定每一次都在累加，不一样，但是id可能会一样，点数据分20个的转换，可能会出现一个点数组里面超过20
        //个点，那么就必须分批转换，同属于一个点数组，这样id就会一样，方便他们全部转换完成后组合到一起
        var str = "window.SMAdapter.callbackFunction" +SMAdapter.eventsCounts + "=function(points){SMAdapter.circulatePointSend(points," + id+ "); }";
        //动态创建回调函数
        eval(str);
        //动态创建script标签
        SMAdapter.load_script(url);
        xs = [];
        ys = [];
    }
    for(var index in points){
        if(index % maxCnt == 0 && index != 0){
            send();
        }
        xs.push(points[index].lng);
        ys.push(points[index].lat);
        if(index == points.length - 1){
            send();
        }
    }
}

/**
 * APIMethod:
 * 创建百度TileLayer，这里的TileLayer中切片的来源为iserver服务器
 * @param url {String} 地图服务的url地址，如：“http://localhost:8090/iserver/services/map-china400/rest/maps/China”
 * @param options 可选的参数
 * transparent - {Boolean} 设置切片是否透明，默认为true
 * cacheEnabled - {Boolean} 设置是否使用缓存，默认为false
 * layersID - {String} 设置临时图层的id，一般用于专题图的叠加使用
 * @returns {BMap.TileLayer} 返回百度的BMap.TileLayer对象
 */
SMAdapter.getBaiduLayer = function(url,options){
    if(url == undefined)
    {
        return;
    }

    var tileLayer = new BMap.TileLayer();
    var layerUrl = url + "/image.png?redirect=false&width=256&height=256";

    //切片是否透明
    var transparent = true;
    if(options && options.transparent !=undefined)
    {
        transparent = options.transparent;
    }
    layerUrl += "&transparent=" + transparent;

    //是否是否使用缓存
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
    //计算百度分辨率数组
    //百度的zoom是从1开始增加的，对应数组里面就是0
    var res = Math.pow(2,17);
    var resAry= [];
    for (var i = 0; i < 17; i++)
    {
        resAry[i] = res;
        res *= 0.5;
    }
    //计算比例尺数组
    var scaAry = [];
    for(var i = 0;i<17;i++)
    {
        scaAry[i] = 0.0254/(96*resAry[i]);
    }
    //重写百度tileLayer的方法getTilesUrl
    tileLayer.getTilesUrl = function(tileCoord, zoom) {
        //计算切片的bounds范围
        var left = tileCoord.x*256*resAry[zoom-1];
        var bottom = tileCoord.y*256*resAry[zoom-1];
        var right = (tileCoord.x + 1)*256*resAry[zoom-1];
        var top = (tileCoord.y + 1)*256*resAry[zoom-1];
        //将bounds组合到url里面
        var myUrl = layerUrl + "&viewBounds=" +"{\"leftBottom\" : {\"x\":" + left +",\"y\":" + bottom +"},\"rightTop\" : {\"x\":" + right +",\"y\":" +top + "}}";
        myUrl +=  "&scale=" + scaAry[zoom-1];
        //只能是3857
        myUrl += "&prjCoordSys={\"epsgCode\":3857}";
        return myUrl;
    }
    return tileLayer;

}
/**
 *  APIMethod:
 *  创建天地图的TTileLayer，这里的TTileLayer中切片的来源为iserver服务器
 *  当把此layer添加进map后，会从map里获取当前的投影是4326还是3857来动态的出图
 * @param url  {String}  地图服务的url地址，如：“localhost:8090/iserver/services/map-world/rest/maps/World”
 * @param options 可选的参数
 * transparent - {Boolean} 设置切片是否透明，默认为true
 * cacheEnabled - {Boolean} 设置是否使用缓存，默认为false
 * layersID - {String} 设置临时图层的id，一般用于专题图的叠加使用
 * @returns {TTileLayer} 返回天地图的TTileLayer对象
 */
SMAdapter.getTiandituLayer = function(url,options){
    if(url == undefined)
    {
        return;
    }
    var tileLayer = new TTileLayer();
    var layerUrl = url + "/image.png?redirect=false&width=256&height=256";

    //切片是否透明
    var transparent = true;
    if(options && options.transparent !=undefined)
    {
        transparent = options.transparent;
    }
    layerUrl += "&transparent=" + transparent;

    //是否是否使用缓存
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

    tileLayer.setGetTileUrl(
        function(x,y,z)
        {
            var tileUrl = layerUrl;

            //由于本身4326的图转成3857时90度转后会多出一部分，起始点不同，所以不能用x,y方式出图
            //同样本身是3857的图转成4326后上下只有85度左右，少了5度，起始点不同，也不能用x,y方式出图
            //获取map上的投影系
            if(this.tmaps.projectionCode == "EPSG:4326")
            {
                tileUrl +="&scale=" +this.scales4326[z];
                tileUrl += "&prjCoordSys={\"epsgCode\":4326}";
                var orginX = -180;var orginY = 90;
                //使用center来出图 （也可以使用bounds出图）
                var centerX = orginX + resolutions4326[z]   *x *256  + resolutions4326[z]*128;
                var centerY = orginY-( resolutions4326[z]   *y *256  + resolutions4326[z]*128)       ;
                tileUrl+= "&center={\"x\":" + centerX+",\"y\":" + centerY + "}" ;
                return tileUrl;
            }
            else if(this.tmaps.projectionCode == "EPSG:900913")
            {
                var po = Math.pow(2,z);
                x-=po/2;
                y=po/2-y-1;
                //使用bounds出图（也可以使用center）
                var left = x*256*resolutions3857[z];
                var bottom = y*256*resolutions3857[z];
                var right = (x + 1)*256*resolutions3857[z];
                var top = (y + 1)*256*resolutions3857[z];
                //将bounds组合到url里面
                tileUrl += "&viewBounds=" +"{\"leftBottom\" : {\"x\":" + left +",\"y\":" + bottom +"},\"rightTop\" : {\"x\":" + right +",\"y\":" +top + "}}";

                tileUrl +="&scale=" +this.scales3857[z];
                tileUrl += "&prjCoordSys={\"epsgCode\":3857}";
            }
            return tileUrl;
        }
    );
    return tileLayer;
}
/**
 * APIMethod:
 * 点投影转换。
 *
 * Parameters:
 * point - {<SuperMap.Geometry.Point> | Object} 带有x,y坐标的点对象。
 * source - {SuperMap.Projection} 源地图坐标系统。
 * dest - {SuperMap.Projection} 目标地图坐标系统。
 *
 * Returns:
 * point - {object} 转换后的坐标。
 */
SMAdapter.transferProjection = function(point, source, dest){
    if (source && dest) {
        if (!(source instanceof SuperMap.Projection)) {
            source = new SuperMap.Projection(source);
        }
        if (!(dest instanceof SuperMap.Projection)) {
            dest = new SuperMap.Projection(dest);
        }
        if (source.proj && dest.proj) {
            point = Proj4js.transform(source.proj, dest.proj, point);
        }
        else {
            var sourceCode = source.getCode();
            var destCode = dest.getCode();
            var transforms = SuperMap.Projection.transforms;
            if (transforms[sourceCode] && transforms[sourceCode][destCode]) {
                transforms[sourceCode][destCode](point);
            }
        }
    }
    return point;
}

/**
 * APIMethod:
 * 将其他坐标系下的点转换为百度的点
 * @param array  点数组，支持四种形式的点：
 * 1、var points = [
 *                          {x:116.1,y:38.9},
 *                          {x:114.1,y:34.1}
 *                          ];
 * 2、var points = [
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          ];
 * 3、var points = [
 *                          new SuperMap.LonLat(116.1,38.9),
 *                          new SuperMap.LonLat(116.1,38.4)
 *                          ];
 * 4、var points = [
 *                          new BMap.Point(116.38,39.9),
 *                          new BMap.Point(116.38,39.9)
 *                          ];
 * @param projection {SuperMap.Projection} 待转换点的投影系（数组里面的所有点投影系都必须是统一的）
 * @param callback {Function} 所绑定的回调函数  （回调函数会以数组形式返回转换后的点数组）
 */
SMAdapter.transferPointToBaidu = function(array,projection,callback){

    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var points = []
        //分几种不同的情况，现在只提供两种
        for(var i = 0;i<array.length;i++)
        {
            var smPoint;
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.LonLat")
            {
                //首先转换为标准4326的坐标
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].lon,array[i].lat),projection,new SuperMap.Projection("EPSG:4326"));

            }
            //支持{x:118,y:38}和SuperMap.Geometry.Point的形式，因为都存在x和y
            else if(array[i].x != undefined && array[i].y != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].x,array[i].y),projection,new SuperMap.Projection("EPSG:4326"));

            }
            //支持BMap.Point的形式
            else if(array[i].lng != undefined && array[i].lat != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].lng,array[i].lat),projection,new SuperMap.Projection("EPSG:4326"));

            }
            var point = new BMap.Point(smPoint.x,smPoint.y);
            points.push(point);
        }
        SMAdapter.callbackPointEventCounts++;
        SMAdapter.callbackPointEvent[SMAdapter.callbackPointEventCounts]=callback;
        //初始转换前的点数组
        SMAdapter.startPointArray[SMAdapter.callbackPointEventCounts] = points;
        //清空转换后点的数组
        SMAdapter.endPointArray[SMAdapter.callbackPointEventCounts] = [];
        //开始转换
        SMAdapter.circulatePointSend(null,SMAdapter.callbackPointEventCounts);
    }
}
/**
 * APIMethod:
 * 将其他坐标系下的点转换为天地图的点
 * @param array 点数组，支持四种形式的点：
 * 1、var points = [
 *                          {x:116.1,y:38.9},
 *                          {x:114.1,y:34.1}
 *                          ];
 * 2、var points = [
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          ];
 * 3、var points = [
 *                          new SuperMap.LonLat(116.1,38.9),
 *                          new SuperMap.LonLat(116.1,38.4)
 *                          ];
 * 4、var points = [
 *                          new TLngLat(116.38,39.9),
 *                          new TLngLat(116.38,39.9)
 *                          ];
 * @param projection  {SuperMap.Projection} 待转换点的投影系（数组里面的所有点投影系都必须是统一的），默认为4326.
 * @returns {Array} 返回TLngLat对象的数组
 */
SMAdapter.transferPointToTianditu = function(array,projection){
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
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].lon,array[i].lat),pro,new SuperMap.Projection("EPSG:4326"));

            }
            //支持{x:118,y:38}和SuperMap.Geometry.Point的形式，因为都存在x和y
            else if(array[i].x != undefined && array[i].y != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].x,array[i].y),pro,new SuperMap.Projection("EPSG:4326"));

            }
            //支持天地图的TLngLat的形式
            else if(array[i].getLng != undefined && array[i].getLat != undefined)
            {
                //首先转换为标准4326的坐标
                smPoint =  SMAdapter.transferProjection(new SuperMap.Geometry.Point(array[i].getLng(),array[i].getLat()),projection,new SuperMap.Projection("EPSG:4326"));

            }
            var point = new TLngLat(smPoint.x,smPoint.y);
            points.push(point);
        }
        return points;
    }
}
/**
 *  APIMethod:
 *  将其他坐标系下的线数组转换为百度支持的线数组
 * @param array 线数组，支持两种形式
 * 1、var lines = [new SuperMap.Geometry.LineString(
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          )];
 * 2、var lines = [new BMap.Polyline(
 *                          new BMap.Point(116.38,39.9),
 *                          new BMap.Point(116.38,39.9)
 *                          )];
 * @param projection {SuperMap.Projection} 需要转换的线的坐标系
 * @param callback {Function} 所绑定的回调函数（回调函数会以数组形式返回转换后的线数组）
 */
SMAdapter.transferLineToBaidu = function(array,projection,callback){
    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var lines = [];
        for(var i = 0;i<array.length;i++)
        {
            var pointsStart = [];
            var pointsEnd = [];
            //支持supermap的LineString
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.Geometry.LineString")
            {
                pointsStart = array[i].components;
                for(var j = 0;j<pointsStart.length;j++)
                {
                    pointsEnd.push(SMAdapter.transferProjection(pointsStart[j],projection,new SuperMap.Projection("EPSG:4326")));
                }

            }
            //支持百度的Polyline，百度混淆后不能根据constructor来判定是什么类型，反而他提供了属性mt来确认
            else if(array[i].mt && array[i].mt == "Polyline")
            {
                pointsStart = array[i].getPath();
                for(var j = 0;j<pointsStart.length;j++)
                {
                    pointsEnd.push(SMAdapter.transferProjection(new SuperMap.Geometry.Point(pointsStart[j].lng,pointsStart[j].lat),projection,new SuperMap.Projection("EPSG:4326")));
                }
            }
            lines.push(pointsEnd);
        }
        SMAdapter.callbackLineEventCounts++;
        SMAdapter.callbackLineEvent[SMAdapter.callbackLineEventCounts]=callback;
        //初始转换前的
        SMAdapter.startLineArray[SMAdapter.callbackLineEventCounts] = lines;
        //清空转换后
        SMAdapter.endLineArray[SMAdapter.callbackLineEventCounts] = [];
        SMAdapter.circulateLineSend(null,SMAdapter.callbackLineEventCounts);
    }
}
/**
 * APIMethod:
 * 将其他坐标系下的线数组转换为天地图支持的线数组
 * @param array 线数组，支持两种形式
 * 1、var lines = [new SuperMap.Geometry.LineString(
 *                          new SuperMap.Geometry.Point(116.1,38.9),
 *                          new SuperMap.Geometry.Point(116.1,38.9)
 *                          )];
 * 2、var lines = [new TPolyline(
 *                          new TLngLat(116.38,39.9),
 *                          new TLngLat(116.38,39.9)
 *                          )];
 * @param projection  {SuperMap.Projection} 需要转换的线的坐标系
 * @returns {Array} 返回TPolyline对象的数组
 */
SMAdapter.transferLineToTianditu = function(array,projection){
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
                var points = SMAdapter.transferPointToTianditu(array[i].components,pro);
                line = new TPolyline(points);
            }
            //支持TPolyline的对象
            else if(array[i].polygonType != undefined && array[i].getType() == 4)
            {
                var points = SMAdapter.transferPointToTianditu(array[i].getLngLats(),pro);
                line = new TPolyline(points);
            }

            lines.push(line);
        }
        return lines;
    }
}
/**
 *  APIMethod:
 *  将其他坐标系下的面数组转换为百度支持的面数组
 * @param array 面数组，支持两种形式
 * 1、var polygons = [new SuperMap.Geometry.Polygon(
 *                          [new SuperMap.Geometry.LinearRing(
 *                                  new SuperMap.Geometry.Point(116.3786889372559,39.90762965106183),
 *                                  new SuperMap.Geometry.Point(116.38632786853032,39.90795884517671),
 *                                  new SuperMap.Geometry.Point(116.38534009082035,39.897432133833574),
 *                                  new SuperMap.Geometry.Point(116.37624058825688,39.89789300648029)
 *                                  )
 *                           ]
 *                        )];
 * 2、var polygons = [new BMap.Polygon(
 *                                  new BMap.Point(116.3786889372559,39.90762965106183),
 *                                  new BMap.Point(116.38632786853032,39.90795884517671),
 *                                  new BMap.Point(116.38534009082035,39.897432133833574),
 *                                  new BMap.Point(116.37624058825688,39.89789300648029)
 *                          )];
 * @param projection {SuperMap.Projection} 需要转换的面的坐标系
 * @param callback {Function} 所绑定的回调函数（回调函数会以数组形式返回转换后的面数组）
 */
SMAdapter.transferPolygonToBaidu = function(array,projection,callback){
    if((typeof array) == "object" && array != null && array.constructor == Array)
    {
        var polygons = [];
        for(var i = 0;i<array.length;i++)
        {
            var pointsStart = [];
            var pointsEnd = [];
            //支持supermap的LineString
            if(array[i].CLASS_NAME && array[i].CLASS_NAME == "SuperMap.Geometry.Polygon")
            {
                pointsStart = array[i].getVertices(false);
                for(var j = 0;j<pointsStart.length;j++)
                {
                    pointsEnd.push(SMAdapter.transferProjection(pointsStart[j],projection,new SuperMap.Projection("EPSG:4326")));
                }

            }
            //支持百度的Polyline，百度混淆后不能根据constructor来判定是什么类型，反而他提供了属性mt来确认
            else if(array[i].mt && array[i].mt == "Polygon")
            {
                pointsStart = array[i].getPath();
                for(var j = 0;j<pointsStart.length;j++)
                {
                    pointsEnd.push(SMAdapter.transferProjection(new SuperMap.Geometry.Point(pointsStart[j].lng,pointsStart[j].lat),projection,new SuperMap.Projection("EPSG:4326")));
                }
            }
            polygons.push(pointsEnd);
        }
        SMAdapter.callbackPolygonEventCounts++;
        SMAdapter.callbackPolygonEvent[SMAdapter.callbackPolygonEventCounts]=callback;
        //初始转换前的
        SMAdapter.startPolygonArray[SMAdapter.callbackPolygonEventCounts] = polygons;
        //清空转换后
        SMAdapter.endPolygonArray[SMAdapter.callbackPolygonEventCounts] = [];
        SMAdapter.circulatePolygonSend(null,SMAdapter.callbackPolygonEventCounts);
    }
}
/**
 * APIMethod:
 * 将其他坐标系下的多边形数组转换为天地图支持的多边形数组
 * @param array 多边形数组，支持两种形式：
 * 1、var polygons = [new SuperMap.Geometry.Polygon(
 *                          [new SuperMap.Geometry.LinearRing(
 *                                  new SuperMap.Geometry.Point(116.3786889372559,39.90762965106183),
 *                                  new SuperMap.Geometry.Point(116.38632786853032,39.90795884517671),
 *                                  new SuperMap.Geometry.Point(116.38534009082035,39.897432133833574),
 *                                  new SuperMap.Geometry.Point(116.37624058825688,39.89789300648029)
 *                                  )
 *                           ]
 *                        )];
 * 2、var polygons = [new TPolygon(
 *                                  new TLngLat(116.3786889372559,39.90762965106183),
 *                                  new TLngLat(116.38632786853032,39.90795884517671),
 *                                  new TLngLat(116.38534009082035,39.897432133833574),
 *                                  new TLngLat(116.37624058825688,39.89789300648029)
 *                          )];
 * @param projection {SuperMap.Projection} 需要转换的多边形的坐标系
 * @returns {Array} 返回TPolygon对象的数组
 */
SMAdapter.transferPolygonToTianditu = function(array,projection){
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
                var points = SMAdapter.transferPointToTianditu(array[i].getVertices(false),pro);
                polygon = new TPolygon(points);
            }

            //支持TPolyline的对象
            else if(array[i].getType != undefined && array[i].getType() == 5)
            {
                var points = SMAdapter.transferPointToTianditu(array[i].getLngLats(),pro);
                polygon = new TPolygon(points);
            }

            polygons.push(polygon);
        }
        return polygons;
    }
}

/**
 * Property:
 * 记录转换前的点数组的数组
 * @type {Array}  BMap.Point数组的数组
 * 首先本身是一个数组，每一个数据代表某一批点数组，每批点数组又是多个点组成的
 */
SMAdapter.startPointArray = [];
/**
 * Property:
 * 记录转成后的点数组的数组
 * @type {Array}   BMap.Point数组的数组
 * 首先本身是一个数组，每一个数据代表某一批点数组，每批点数组又是多个点组成的
 */
SMAdapter.endPointArray = [];
/**
 * Property:
 * 记录用户注册的点回调函数数组
 * @type {Array} 回调函数数组
 */
SMAdapter.callbackPointEvent = [];
/**
 * Property:
 * 记录当前为第多少批点数组需要进行转换
 * @type {number} 默认为-1，每有一批点数组需要转换就自加1
 */
SMAdapter.callbackPointEventCounts = -1;
/**
 * Method:
 * 每次服务器转换完点后的回调函数，在此判定是否将所有点全部转换，如果没有则继续转换
 * @param xyResults 服务器传回的坐标集合
 * @param id 代表此次转换完的点是属于第id批的点数组，避免回调函数出错
 */
SMAdapter.circulatePointSend = function(xyResults,id){

    if(xyResults !=null)
    {
        for(var index in xyResults){
            xyResult = xyResults[index];
            if(xyResult.error != 0){continue;}//出错就直接返回;
            var resultPoint = new BMap.Point(xyResult.x, xyResult.y);
            SMAdapter.endPointArray[id].push(resultPoint);
        }
    }

    //如果点已经全部转换，则直接将所有点传递给外部用户，否则继续转换
    if(SMAdapter.startPointArray[id].length == 0)
    {
        SMAdapter.callbackPointEvent[id](SMAdapter.endPointArray[id]);
    }
    else
    {
        var pots = [];
        if(SMAdapter.startPointArray[id].length>20)
        {
            pots = SMAdapter.startPointArray[id].splice(0,20);
        }
        else
        {
            pots = SMAdapter.startPointArray[id].splice(0,SMAdapter.startPointArray[id].length);
        }
        SMAdapter.transMore(pots,0,id);
    }

}
/**
 *  Property:
 *  记录转换前的线数组的数组
 * @type {Array} 线数组的数组
 * 首先本身是一个数组，每一个数据代表某一批线数组，每批线数组又是多条线组成的，每一条线其实又是点数组
 */
SMAdapter.startLineArray = [];
/**
 * Property:
 * 记录转换后的线数组的数组
 * @type {Array}  BMap.Polyline数组的数组
 * 首先本身是一个数组，每一个数据代表某一批BMap.Polyline线数组，每批线数组又是多条BMap.Polyline线组成的
 */
SMAdapter.endLineArray = [];
/**
 * Property:
 * 记录用户注册的线回调函数数组
 * @type {Array} 回调函数数组
 */
SMAdapter.callbackLineEvent = [];
/**
 * Property:
 *  记录当前为第多少批线数组需要进行转换
 * @type {number}  默认为-1，每有一批线数组需要转换就自加1
 */
SMAdapter.callbackLineEventCounts = -1;
/**
 * Method:
 * 每次服务器转换完线后的回调函数，在此判定是否将所有线全部转换，如果没有则继续转换
 * @param points  转换后的每一条线的点集合
 * @param id 代表此次转换完的线是属于第id批的线数组，避免回调函数出错
 */
SMAdapter.circulateLineSend = function(points,id){
    if(points !=null)
    {
        var line =new BMap.Polyline(points, {strokeColor:"blue", strokeWeight:6, strokeOpacity:0.5});
        SMAdapter.endLineArray[id].push(line);
    }
    if(SMAdapter.startLineArray[id].length == 0)
    {
        SMAdapter.callbackLineEvent[id](SMAdapter.endLineArray[id]);
    }
    else
    {
        var pots = SMAdapter.startLineArray[id].splice(0,1);
        SMAdapter.transferPointToBaidu(pots[0],new SuperMap.Projection("EPSG:4326"),SMAdapter.circulateLineSend);
    }
}
/**
 *  Property:
 *  记录转换前的面数组的数组
 * @type {Array} 面数组的数组
 * 首先本身是一个数组，每一个数据代表某一批面数组，每批面数组又是多个面组成的，每一个面其实又是点数组组成的
 */
SMAdapter.startPolygonArray = [];
/**
 * Property:
 * 记录转换后的面数组的数组
 * @type {Array}  BMap.Polygon数组的数组
 * 首先本身是一个数组，每一个数据代表某一批BMap.Polygon面数组，每批面数组又是多个BMap.Polygon面组成的
 */
SMAdapter.endPolygonArray = [];
/**
 * Property:
 * 记录用户注册的面回调函数数组
 * @type {Array}  回调函数数组
 */
SMAdapter.callbackPolygonEvent = [];
/**
 * Property:
 *  记录当前为第多少批面数组需要进行转换
 * @type {number}  默认为-1，每有一批面数组需要转换就自加1
 */
SMAdapter.callbackPolygonEventCounts = -1;
/**
 * Method:
 * 每次服务器转换完面后的回调函数，在此判定是否将所有面全部转换，如果没有则继续转换
 * @param points  转换后的每一个面的点集合
 * @param id 代表此次转换完的面是属于第id批的面数组，避免回调函数出错
 */
SMAdapter.circulatePolygonSend = function(points,id){
    if(points !=null)
    {
        var polygon =new BMap.Polygon(points, {strokeColor:"blue", strokeWeight:6, strokeOpacity:0.5});
        SMAdapter.endPolygonArray[id].push(polygon);
    }
    if(SMAdapter.startPolygonArray[id].length == 0)
    {
        SMAdapter.callbackPolygonEvent[id](SMAdapter.endPolygonArray[id]);
    }
    else
    {
        var pots = SMAdapter.startPolygonArray[id].splice(0,1);
        SMAdapter.transferPointToBaidu(pots[0],new SuperMap.Projection("EPSG:4326"),SMAdapter.circulatePolygonSend);
    }
}






