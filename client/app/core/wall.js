module.exports = (function(){

	function Wall(props){
		this.name = props.name;
		this.color = props.color || this.color;
		this.x = props.x;
		this.y = props.y;
		this.width = props.width;
		this.height = props.height;
	}

	Wall.prototype = {
		x : 0,
		y : 0,
		height : 0,
		width : 0,
		name : "",
		color : "gray",
		draw : function(context){
			this[this.name](context);
		},
		left:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo(this.x * this.width,(this.y + 1) * this.height);
			context.stroke();
		},
		rigth:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo((this.x * this.width) + this.width,this.y * this.height);
			context.lineTo((this.x + 1) * this.width, (this.y + 1) * this.height);
			context.stroke();
		},
		top : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo((this.x * this.width) + this.width,this.y * this.height);
			context.stroke();	
		},
		bottom : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,(this.y * this.height) + this.height);
			context.lineTo((this.x * this.width) + this.width,(this.y + 1) * this.height);
			context.stroke();
		}
	};

	return Wall;

}());