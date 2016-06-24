module.exports=(function(){

	var onMouseMoveCallBack;

	function MouseEventListener(props){
		this.init(props);
	}

	function getMousePos(element, evt) {
        var rect = element.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      }

	MouseEventListener.prototype = {
			element : null,
		    init : function(props){
		    	this.element = props.element;
		    	onMouseMoveCallBack = props.onMouseMove || function(){};
		        this.bindEvents();
		    },
		    bindEvents : function(){
		        this.element.addEventListener('mousemove',function(e){
		        	this.onMouseMove(e,this.element);
		        }.bind(this),false);
		    },
		    onMouseMove : function(e,element){
				var position = getMousePos(element,e);
				onMouseMoveCallBack(position.x,position.y);
			}
	};
    

	return MouseEventListener;

}());