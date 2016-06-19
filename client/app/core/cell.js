module.exports = (function(){

	var Wall = require("./wall"),
		Config = require("./config-maze");

	function Cell(rawCell){
		this.walls = {
			left : null,
			rigth : null,
			top : null,
			bottom : null
		};
		this.init(rawCell);
	}

	Cell.prototype = {
		names : ["left","rigth","top","bottom"],
		x : 0,
		y : 0,
		width : Config.CELL_SIZE,
		height : Config.CELL_SIZE,
		visited : false,
		walls : {
			left : null,
			rigth : null,
			top : null,
			bottom : null
		},
		init : function(props){
			this.x = props.x;
			this.y = props.y;
			this.width = props.width;
			this.height = props.height;
			this.createWalls(props.walls);
		},
		createWalls : function(props){
			var self = this;
			for(var p in props){
				var obj = props[p];
				if(!obj){
					this.walls[p] = null;
				}else{
					this.walls[p] = new Wall({
						name : p,
						x : obj.x,
						y : obj.y,
						height : obj.height,
						width : obj.width
					});
				}
			}
		},
		draw : function(context){
			this.names.forEach(function(name){
				var wall = this.walls[name];
				if(wall){
					wall.draw(context);
				}
			},this);
		}
	};

	return Cell;

}());