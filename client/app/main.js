(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\maze engine\\client\\app\\app.js":[function(require,module,exports){
(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze");

	function Main(){}

	Main.prototype = {
		editor : null,
		maze : null,
		canvas : null,
		context : null,
		init : function(){

			this.editor = ace.edit("editor");
		    this.editor.setTheme("ace/theme/monokai");
		    this.editor.getSession().setMode("ace/mode/javascript");

			this.canvas = document.querySelector(".main-canvas");
			this.context = this.canvas.getContext("2d");

			this.canvas.width = Config.CELL_SIZE * Config.WIDTH;
			this.canvas.height = Config.CELL_SIZE * Config.HEIGHT;

			this.fetchMazeAndDraw();

			this.bindEvents();
		},
		fetchMazeAndDraw:function(){
			this.fetchMaze().then(function(cells){
				this.maze = new Maze({
					cells : cells
				});
				this.draw();
			}.bind(this));
		},
		bindEvents : function(){
			var btnDrawSolution = document.getElementById("input-draw-solution");
			
			btnDrawSolution.addEventListener("click",this.handleClickDrawSolution.bind(this),false);
			
			var btnNewMaze = document.getElementById("input-new-maze");

			btnNewMaze.addEventListener("click",this.handleClickNewMaze.bind(this),false);

		},
		handleClickNewMaze : function(){
			this.maze.stopAnimation();
			this.fetchMazeAndDraw();
		},
		handleClickDrawSolution : function(){
			var codeSolution = this.editor.getSession().getValue();

			codeSolution = eval(codeSolution);	

			var result = codeSolution.bind(this.maze)(0,0,this.maze.width - 1 , this.maze.height -1);

			if(this.maze.animationInterval && this.maze.mainInterval){
				this.maze.stopAnimation();
				this.maze.clearCell(this.context,this.maze.lastNode);
			}

			if(result && result.length){
				this.maze.drawSolution(this.context,result);
			}

			/*this.fetchMazeSolution({
				cells : this.maze.cells
			}).then(function(response){
				this.maze.drawSolution(this.context,response);
			}.bind(this));*/
		},
		draw : function(){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			this.maze.draw(this.context);
		},
		fetchMaze : function(){
			return fetch("/api/v1/maze?width="+Config.WIDTH+"&height="+Config.HEIGHT,{
				method: 'GET', 
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
		fetchMazeSolution : function(data){
			return fetch("/api/v1/maze/solution",{
				method: 'POST', 
				body : JSON.stringify(data),
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
	};

	main = new Main();

	window.onload = main.init.bind(main);

}());
},{"../app/core/config-maze":"C:\\maze engine\\client\\app\\core\\config-maze.js","../app/core/maze":"C:\\maze engine\\client\\app\\core\\maze.js"}],"C:\\maze engine\\client\\app\\core\\cell.js":[function(require,module,exports){
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
},{"./config-maze":"C:\\maze engine\\client\\app\\core\\config-maze.js","./wall":"C:\\maze engine\\client\\app\\core\\wall.js"}],"C:\\maze engine\\client\\app\\core\\config-maze.js":[function(require,module,exports){
module.exports = {
	CELL_SIZE : 20,
	WIDTH :20,
	HEIGHT : 20
};
},{}],"C:\\maze engine\\client\\app\\core\\maze.js":[function(require,module,exports){
module.exports = (function(){

	var Cell = require("./cell");

	function Maze(props){
		this.init(props);
	}

	Maze.prototype = {
		width : 0,
		height : 0,
		cells : [],
		solution : [],
		animationInterval : null,
		mainInterval : null,
		lastNode : null,
		init : function(props){
			this.width = props.cells.length;
			this.height = props.cells[0].length;
			this.createCells(props.cells);
		},
		createCells : function(rawCells){
			for (var i = 0; i < rawCells.length; i++) {
		        this.cells[i] = [];
		        for (var j = 0; j < rawCells[i].length; j++) {
		            this.cells[i][j] = new Cell(rawCells[i][j]);
		        }
		    }
		},
		draw : function(context){
			this.fillCell(context,this.cells[0][0], "blue");
			this.fillCell(context,this.cells[this.width - 1][this.height - 1], "red");

			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		drawSolution : function(context,sol){
			this.solution = sol;

			this.solution.shift();
			this.solution.pop();

			this.lastNode = this.cells[0][0];

            this.animationInterval = requestAnimationFrame(this.animatePath.bind(this,context));

            this.mainInterval = setInterval(function(){
            	this.animatePath(context);
            }.bind(this),250);

		},
		animatePath:function(context){

			this.clearCell(context,this.lastNode);
        	
			if(this.solution.length === 0){
        		this.stopAnimation();
        		return;
        	}

        	
        	var cell = this.solution.shift();
        	
        	if(Math.abs(cell.x - this.lastNode.x) > 1 ||
        		Math.abs(cell.y - this.lastNode.y) > 1){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x > this.lastNode.x && this.lastNode.walls.rigth){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.y < this.lastNode.y && this.lastNode.walls.top){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	if(cell.y > this.lastNode.y && this.lastNode.walls.bottom){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x < this.lastNode.x && this.lastNode.walls.left){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	this.fillCell(context,cell, "blue");
        	
        	this.lastNode = cell;
		},
		stopAnimation : function(){
			cancelAnimationFrame(this.animationInterval);
        	clearInterval(this.mainInterval);
        	this.animationInterval = null;
        	this.mainInterval = null;
		},
		fillCell : function(context,cell,color){
			context.fillStyle = color;
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.fillRect(x,y,cell.width / 2,cell.height / 2);
		},
		clearCell : function(context,cell){
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.clearRect(x,y,cell.width / 2,cell.height / 2);
		}
	};

	return Maze;

}());
},{"./cell":"C:\\maze engine\\client\\app\\core\\cell.js"}],"C:\\maze engine\\client\\app\\core\\wall.js":[function(require,module,exports){
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
},{}]},{},["C:\\maze engine\\client\\app\\app.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvYXBwL2FwcC5qcyIsImNsaWVudC9hcHAvY29yZS9jZWxsLmpzIiwiY2xpZW50L2FwcC9jb3JlL2NvbmZpZy1tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL21hemUuanMiLCJjbGllbnQvYXBwL2NvcmUvd2FsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCl7XHJcblxyXG5cdFwidXNlIHN0cmljdFwiO1xyXG5cclxuXHR2YXIgbWFpbiA9IG51bGwsXHJcblx0XHRNYXplID0gcmVxdWlyZShcIi4uL2FwcC9jb3JlL21hemVcIiksXHJcblx0XHRDb25maWcgPSByZXF1aXJlKFwiLi4vYXBwL2NvcmUvY29uZmlnLW1hemVcIik7XHJcblxyXG5cdGZ1bmN0aW9uIE1haW4oKXt9XHJcblxyXG5cdE1haW4ucHJvdG90eXBlID0ge1xyXG5cdFx0ZWRpdG9yIDogbnVsbCxcclxuXHRcdG1hemUgOiBudWxsLFxyXG5cdFx0Y2FudmFzIDogbnVsbCxcclxuXHRcdGNvbnRleHQgOiBudWxsLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKCl7XHJcblxyXG5cdFx0XHR0aGlzLmVkaXRvciA9IGFjZS5lZGl0KFwiZWRpdG9yXCIpO1xyXG5cdFx0ICAgIHRoaXMuZWRpdG9yLnNldFRoZW1lKFwiYWNlL3RoZW1lL21vbm9rYWlcIik7XHJcblx0XHQgICAgdGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIpO1xyXG5cclxuXHRcdFx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1haW4tY2FudmFzXCIpO1xyXG5cdFx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG5cdFx0XHR0aGlzLmNhbnZhcy53aWR0aCA9IENvbmZpZy5DRUxMX1NJWkUgKiBDb25maWcuV0lEVEg7XHJcblx0XHRcdHRoaXMuY2FudmFzLmhlaWdodCA9IENvbmZpZy5DRUxMX1NJWkUgKiBDb25maWcuSEVJR0hUO1xyXG5cclxuXHRcdFx0dGhpcy5mZXRjaE1hemVBbmREcmF3KCk7XHJcblxyXG5cdFx0XHR0aGlzLmJpbmRFdmVudHMoKTtcclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemVBbmREcmF3OmZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplKCkudGhlbihmdW5jdGlvbihjZWxscyl7XHJcblx0XHRcdFx0dGhpcy5tYXplID0gbmV3IE1hemUoe1xyXG5cdFx0XHRcdFx0Y2VsbHMgOiBjZWxsc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMuZHJhdygpO1xyXG5cdFx0XHR9LmJpbmQodGhpcykpO1xyXG5cdFx0fSxcclxuXHRcdGJpbmRFdmVudHMgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgYnRuRHJhd1NvbHV0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dC1kcmF3LXNvbHV0aW9uXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0YnRuRHJhd1NvbHV0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuaGFuZGxlQ2xpY2tEcmF3U29sdXRpb24uYmluZCh0aGlzKSxmYWxzZSk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgYnRuTmV3TWF6ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXQtbmV3LW1hemVcIik7XHJcblxyXG5cdFx0XHRidG5OZXdNYXplLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuaGFuZGxlQ2xpY2tOZXdNYXplLmJpbmQodGhpcyksZmFsc2UpO1xyXG5cclxuXHRcdH0sXHJcblx0XHRoYW5kbGVDbGlja05ld01hemUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLm1hemUuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHR0aGlzLmZldGNoTWF6ZUFuZERyYXcoKTtcclxuXHRcdH0sXHJcblx0XHRoYW5kbGVDbGlja0RyYXdTb2x1dGlvbiA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBjb2RlU29sdXRpb24gPSB0aGlzLmVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKTtcclxuXHJcblx0XHRcdGNvZGVTb2x1dGlvbiA9IGV2YWwoY29kZVNvbHV0aW9uKTtcdFxyXG5cclxuXHRcdFx0dmFyIHJlc3VsdCA9IGNvZGVTb2x1dGlvbi5iaW5kKHRoaXMubWF6ZSkoMCwwLHRoaXMubWF6ZS53aWR0aCAtIDEgLCB0aGlzLm1hemUuaGVpZ2h0IC0xKTtcclxuXHJcblx0XHRcdGlmKHRoaXMubWF6ZS5hbmltYXRpb25JbnRlcnZhbCAmJiB0aGlzLm1hemUubWFpbkludGVydmFsKXtcclxuXHRcdFx0XHR0aGlzLm1hemUuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMubWF6ZS5jbGVhckNlbGwodGhpcy5jb250ZXh0LHRoaXMubWF6ZS5sYXN0Tm9kZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKHJlc3VsdCAmJiByZXN1bHQubGVuZ3RoKXtcclxuXHRcdFx0XHR0aGlzLm1hemUuZHJhd1NvbHV0aW9uKHRoaXMuY29udGV4dCxyZXN1bHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKnRoaXMuZmV0Y2hNYXplU29sdXRpb24oe1xyXG5cdFx0XHRcdGNlbGxzIDogdGhpcy5tYXplLmNlbGxzXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdHRoaXMubWF6ZS5kcmF3U29sdXRpb24odGhpcy5jb250ZXh0LHJlc3BvbnNlKTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpKTsqL1xyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLmNhbnZhcy53aWR0aCx0aGlzLmNhbnZhcy5oZWlnaHQpO1xyXG5cdFx0XHR0aGlzLm1hemUuZHJhdyh0aGlzLmNvbnRleHQpO1xyXG5cdFx0fSxcclxuXHRcdGZldGNoTWF6ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBmZXRjaChcIi9hcGkvdjEvbWF6ZT93aWR0aD1cIitDb25maWcuV0lEVEgrXCImaGVpZ2h0PVwiK0NvbmZpZy5IRUlHSFQse1xyXG5cdFx0XHRcdG1ldGhvZDogJ0dFVCcsIFxyXG5cdFx0XHRcdGhlYWRlcnM6IG5ldyBIZWFkZXJzKHtcclxuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemVTb2x1dGlvbiA6IGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRyZXR1cm4gZmV0Y2goXCIvYXBpL3YxL21hemUvc29sdXRpb25cIix7XHJcblx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsIFxyXG5cdFx0XHRcdGJvZHkgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcclxuXHRcdFx0XHRoZWFkZXJzOiBuZXcgSGVhZGVycyh7XHJcblx0XHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cdG1haW4gPSBuZXcgTWFpbigpO1xyXG5cclxuXHR3aW5kb3cub25sb2FkID0gbWFpbi5pbml0LmJpbmQobWFpbik7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdHZhciBXYWxsID0gcmVxdWlyZShcIi4vd2FsbFwiKSxcclxuXHRcdENvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZy1tYXplXCIpO1xyXG5cclxuXHRmdW5jdGlvbiBDZWxsKHJhd0NlbGwpe1xyXG5cdFx0dGhpcy53YWxscyA9IHtcclxuXHRcdFx0bGVmdCA6IG51bGwsXHJcblx0XHRcdHJpZ3RoIDogbnVsbCxcclxuXHRcdFx0dG9wIDogbnVsbCxcclxuXHRcdFx0Ym90dG9tIDogbnVsbFxyXG5cdFx0fTtcclxuXHRcdHRoaXMuaW5pdChyYXdDZWxsKTtcclxuXHR9XHJcblxyXG5cdENlbGwucHJvdG90eXBlID0ge1xyXG5cdFx0bmFtZXMgOiBbXCJsZWZ0XCIsXCJyaWd0aFwiLFwidG9wXCIsXCJib3R0b21cIl0sXHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0d2lkdGggOiBDb25maWcuQ0VMTF9TSVpFLFxyXG5cdFx0aGVpZ2h0IDogQ29uZmlnLkNFTExfU0laRSxcclxuXHRcdHZpc2l0ZWQgOiBmYWxzZSxcclxuXHRcdHdhbGxzIDoge1xyXG5cdFx0XHRsZWZ0IDogbnVsbCxcclxuXHRcdFx0cmlndGggOiBudWxsLFxyXG5cdFx0XHR0b3AgOiBudWxsLFxyXG5cdFx0XHRib3R0b20gOiBudWxsXHJcblx0XHR9LFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dGhpcy54ID0gcHJvcHMueDtcclxuXHRcdFx0dGhpcy55ID0gcHJvcHMueTtcclxuXHRcdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0XHR0aGlzLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuXHRcdFx0dGhpcy5jcmVhdGVXYWxscyhwcm9wcy53YWxscyk7XHJcblx0XHR9LFxyXG5cdFx0Y3JlYXRlV2FsbHMgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFx0Zm9yKHZhciBwIGluIHByb3BzKXtcclxuXHRcdFx0XHR2YXIgb2JqID0gcHJvcHNbcF07XHJcblx0XHRcdFx0aWYoIW9iail7XHJcblx0XHRcdFx0XHR0aGlzLndhbGxzW3BdID0gbnVsbDtcclxuXHRcdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRcdHRoaXMud2FsbHNbcF0gPSBuZXcgV2FsbCh7XHJcblx0XHRcdFx0XHRcdG5hbWUgOiBwLFxyXG5cdFx0XHRcdFx0XHR4IDogb2JqLngsXHJcblx0XHRcdFx0XHRcdHkgOiBvYmoueSxcclxuXHRcdFx0XHRcdFx0aGVpZ2h0IDogb2JqLmhlaWdodCxcclxuXHRcdFx0XHRcdFx0d2lkdGggOiBvYmoud2lkdGhcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0dGhpcy5uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpe1xyXG5cdFx0XHRcdHZhciB3YWxsID0gdGhpcy53YWxsc1tuYW1lXTtcclxuXHRcdFx0XHRpZih3YWxsKXtcclxuXHRcdFx0XHRcdHdhbGwuZHJhdyhjb250ZXh0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sdGhpcyk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIENlbGw7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdENFTExfU0laRSA6IDIwLFxyXG5cdFdJRFRIIDoyMCxcclxuXHRIRUlHSFQgOiAyMFxyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdHZhciBDZWxsID0gcmVxdWlyZShcIi4vY2VsbFwiKTtcclxuXHJcblx0ZnVuY3Rpb24gTWF6ZShwcm9wcyl7XHJcblx0XHR0aGlzLmluaXQocHJvcHMpO1xyXG5cdH1cclxuXHJcblx0TWF6ZS5wcm90b3R5cGUgPSB7XHJcblx0XHR3aWR0aCA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0Y2VsbHMgOiBbXSxcclxuXHRcdHNvbHV0aW9uIDogW10sXHJcblx0XHRhbmltYXRpb25JbnRlcnZhbCA6IG51bGwsXHJcblx0XHRtYWluSW50ZXJ2YWwgOiBudWxsLFxyXG5cdFx0bGFzdE5vZGUgOiBudWxsLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dGhpcy53aWR0aCA9IHByb3BzLmNlbGxzLmxlbmd0aDtcclxuXHRcdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5jZWxsc1swXS5sZW5ndGg7XHJcblx0XHRcdHRoaXMuY3JlYXRlQ2VsbHMocHJvcHMuY2VsbHMpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZUNlbGxzIDogZnVuY3Rpb24ocmF3Q2VsbHMpe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJhd0NlbGxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHQgICAgICAgIHRoaXMuY2VsbHNbaV0gPSBbXTtcclxuXHRcdCAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByYXdDZWxsc1tpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0ICAgICAgICAgICAgdGhpcy5jZWxsc1tpXVtqXSA9IG5ldyBDZWxsKHJhd0NlbGxzW2ldW2pdKTtcclxuXHRcdCAgICAgICAgfVxyXG5cdFx0ICAgIH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzW3RoaXMud2lkdGggLSAxXVt0aGlzLmhlaWdodCAtIDFdLCBcInJlZFwiKTtcclxuXHJcblx0XHRcdHRoaXMuY2VsbHMuZm9yRWFjaChmdW5jdGlvbiAocm93cykge1xyXG5cdFx0XHRcdHJvd3MuZm9yRWFjaChmdW5jdGlvbihjZWxsKXtcclxuXHRcdFx0XHRcdGNlbGwuZHJhdyhjb250ZXh0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0ZHJhd1NvbHV0aW9uIDogZnVuY3Rpb24oY29udGV4dCxzb2wpe1xyXG5cdFx0XHR0aGlzLnNvbHV0aW9uID0gc29sO1xyXG5cclxuXHRcdFx0dGhpcy5zb2x1dGlvbi5zaGlmdCgpO1xyXG5cdFx0XHR0aGlzLnNvbHV0aW9uLnBvcCgpO1xyXG5cclxuXHRcdFx0dGhpcy5sYXN0Tm9kZSA9IHRoaXMuY2VsbHNbMF1bMF07XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0ZVBhdGguYmluZCh0aGlzLGNvbnRleHQpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgXHR0aGlzLmFuaW1hdGVQYXRoKGNvbnRleHQpO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcyksMjUwKTtcclxuXHJcblx0XHR9LFxyXG5cdFx0YW5pbWF0ZVBhdGg6ZnVuY3Rpb24oY29udGV4dCl7XHJcblxyXG5cdFx0XHR0aGlzLmNsZWFyQ2VsbChjb250ZXh0LHRoaXMubGFzdE5vZGUpO1xyXG4gICAgICAgIFx0XHJcblx0XHRcdGlmKHRoaXMuc29sdXRpb24ubGVuZ3RoID09PSAwKXtcclxuICAgICAgICBcdFx0dGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdHZhciBjZWxsID0gdGhpcy5zb2x1dGlvbi5zaGlmdCgpO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHRpZihNYXRoLmFicyhjZWxsLnggLSB0aGlzLmxhc3ROb2RlLngpID4gMSB8fFxyXG4gICAgICAgIFx0XHRNYXRoLmFicyhjZWxsLnkgLSB0aGlzLmxhc3ROb2RlLnkpID4gMSl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0aWYoY2VsbC54ID4gdGhpcy5sYXN0Tm9kZS54ICYmIHRoaXMubGFzdE5vZGUud2FsbHMucmlndGgpe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuICAgICAgICBcdFx0cmV0dXJuO1xyXG4gICAgICAgIFx0fVxyXG5cclxuICAgICAgICBcdGlmKGNlbGwueSA8IHRoaXMubGFzdE5vZGUueSAmJiB0aGlzLmxhc3ROb2RlLndhbGxzLnRvcCl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpXHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihjZWxsLnkgPiB0aGlzLmxhc3ROb2RlLnkgJiYgdGhpcy5sYXN0Tm9kZS53YWxscy5ib3R0b20pe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuICAgICAgICBcdFx0cmV0dXJuO1xyXG4gICAgICAgIFx0fVxyXG5cclxuICAgICAgICBcdGlmKGNlbGwueCA8IHRoaXMubGFzdE5vZGUueCAmJiB0aGlzLmxhc3ROb2RlLndhbGxzLmxlZnQpe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKVxyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LGNlbGwsIFwiYmx1ZVwiKTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0dGhpcy5sYXN0Tm9kZSA9IGNlbGw7XHJcblx0XHR9LFxyXG5cdFx0c3RvcEFuaW1hdGlvbiA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwpO1xyXG4gICAgICAgIFx0Y2xlYXJJbnRlcnZhbCh0aGlzLm1haW5JbnRlcnZhbCk7XHJcbiAgICAgICAgXHR0aGlzLmFuaW1hdGlvbkludGVydmFsID0gbnVsbDtcclxuICAgICAgICBcdHRoaXMubWFpbkludGVydmFsID0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRmaWxsQ2VsbCA6IGZ1bmN0aW9uKGNvbnRleHQsY2VsbCxjb2xvcil7XHJcblx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XHJcblx0XHRcdHZhciB4ID0gKGNlbGwueCAqIGNlbGwud2lkdGgpICsgNTtcclxuXHRcdFx0dmFyIHkgPSAoY2VsbC55ICogY2VsbC5oZWlnaHQpICsgNTtcclxuXHRcdFx0Y29udGV4dC5maWxsUmVjdCh4LHksY2VsbC53aWR0aCAvIDIsY2VsbC5oZWlnaHQgLyAyKTtcclxuXHRcdH0sXHJcblx0XHRjbGVhckNlbGwgOiBmdW5jdGlvbihjb250ZXh0LGNlbGwpe1xyXG5cdFx0XHR2YXIgeCA9IChjZWxsLnggKiBjZWxsLndpZHRoKSArIDU7XHJcblx0XHRcdHZhciB5ID0gKGNlbGwueSAqIGNlbGwuaGVpZ2h0KSArIDU7XHJcblx0XHRcdGNvbnRleHQuY2xlYXJSZWN0KHgseSxjZWxsLndpZHRoIC8gMixjZWxsLmhlaWdodCAvIDIpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBNYXplO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHRmdW5jdGlvbiBXYWxsKHByb3BzKXtcclxuXHRcdHRoaXMubmFtZSA9IHByb3BzLm5hbWU7XHJcblx0XHR0aGlzLmNvbG9yID0gcHJvcHMuY29sb3IgfHwgdGhpcy5jb2xvcjtcclxuXHRcdHRoaXMueCA9IHByb3BzLng7XHJcblx0XHR0aGlzLnkgPSBwcm9wcy55O1xyXG5cdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcblx0fVxyXG5cclxuXHRXYWxsLnByb3RvdHlwZSA9IHtcclxuXHRcdHggOiAwLFxyXG5cdFx0eSA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0d2lkdGggOiAwLFxyXG5cdFx0bmFtZSA6IFwiXCIsXHJcblx0XHRjb2xvciA6IFwiZ3JheVwiLFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHR0aGlzW3RoaXMubmFtZV0oY29udGV4dCk7XHJcblx0XHR9LFxyXG5cdFx0bGVmdDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLCh0aGlzLnkgKyAxKSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdH0sXHJcblx0XHRyaWd0aDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKCh0aGlzLnggKiB0aGlzLndpZHRoKSArIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbygodGhpcy54ICsgMSkgKiB0aGlzLndpZHRoLCAodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9LFxyXG5cdFx0dG9wIDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHRcclxuXHRcdH0sXHJcblx0XHRib3R0b20gOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsKHRoaXMueSAqIHRoaXMuaGVpZ2h0KSArIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCwodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIFdhbGw7XHJcblxyXG59KCkpOyJdfQ==
