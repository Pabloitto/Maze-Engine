module.exports = (function(){

	function ImageFactory(){}

	var path = '/app/img/',
        ext = '.png',
        loaded={};
    
    ImageFactory.prototype = {
    	loadImage : function(name){
	        var image = null;
	        if(!loaded[name + ext]){
	            image = new Image();
	            /*image.onload = function(){
	            	
	            };*/
	            loaded[name + ext] = image;
	            image.src = path + name + ext;
	        }else{
	            image = loaded[name + ext];
	        }
	        return image;
	    },
	    getImage : function(name){
	        return loaded[name + ext];
	    }
    };

	return ImageFactory;

}());