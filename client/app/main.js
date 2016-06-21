(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\Maze-Engine\\client\\app\\app.js":[function(require,module,exports){
(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze"),
		UserInteraction = require("../app/core/user-interaction"),
		interaction = null;

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
				interaction = new UserInteraction({
					cell : cells[0][0]
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

			var initialNode = this.maze.cells[0][0];
			var codeSolution = this.editor.getSession().getValue();

			interaction.init({
				cells : this.maze.cells,
				cell : {
					x : initialNode.x,
					y : initialNode.y,
					width : initialNode.width,
					height : initialNode.height,
					walls : {
						rigth : initialNode.walls.rigth,
						left : initialNode.walls.left,
						top : initialNode.walls.top,
						bottom : initialNode.walls.bottom
					}
				}
			});

			interaction.run = eval(codeSolution);	

			interaction.run();

			var solution = interaction.moves;

			if(this.maze.animationInterval && this.maze.mainInterval){
				this.maze.stopAnimation();
				this.maze.clearCell(this.context,this.maze.lastNode);
			}

			if(solution && solution.length){
				this.maze.drawSolution(this.context,solution);
			}
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
},{"../app/core/config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","../app/core/maze":"C:\\Maze-Engine\\client\\app\\core\\maze.js","../app/core/user-interaction":"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js"}],"C:\\Maze-Engine\\client\\app\\core\\cell.js":[function(require,module,exports){
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
},{"./config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","./wall":"C:\\Maze-Engine\\client\\app\\core\\wall.js"}],"C:\\Maze-Engine\\client\\app\\core\\config-maze.js":[function(require,module,exports){
module.exports = {
	CELL_SIZE : 20,
	WIDTH :20,
	HEIGHT : 20
};
},{}],"C:\\Maze-Engine\\client\\app\\core\\maze.js":[function(require,module,exports){
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

			this.lastNode = this.cells[0][0];

            this.animationInterval = requestAnimationFrame(this.animatePath.bind(this,context));

            this.mainInterval = setInterval(function(){
            	this.animatePath(context);
            }.bind(this),250);

		},
		animatePath:function(context){
        	
			if(this.solution.length === 0){
				this.clearCell(context,this.lastNode);
				this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	this.clearCell(context,this.lastNode);

        	
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
},{"./cell":"C:\\Maze-Engine\\client\\app\\core\\cell.js"}],"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js":[function(require,module,exports){
module.exports = (function(){

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		cells : [],
		cell : null,
		x : 0,
		y : 0,
		moves : [],
		init : function(props){
			this.cell = props.cell;
			this.cells = props.cells;
			this.moves = [];
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			console.log("Is Complete " + this.cell.x + " " + this.cell.y);
			return this.cell.x === this.cells.length - 1 && this.cell.y === this.cells[0].length - 1;
		},
		moveTo : function(direction){
			if(!this.canMoveTo(direction)){
				return null;
			}
			var nextMove = this.getNextMove(direction);
			this.moves.push(nextMove);
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = this.moves[this.moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				this.cell.x-=1;
				break;
				case 'rigth' : 
				this.cell.x += 1;
				break;
				case 'bottom' : 
				this.cell.y += 1;
				break;
				case 'top' : 
				this.cell.y -= 1;
				break;
			}

			return this.getSingleMove();
			
		},
		getSingleMove : function(){
			var initialNode = this.cells[this.cell.x][this.cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					rigth : initialNode.walls.rigth,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		run : function(){
			//this method could be overrided by user
		},
	};


	return UserInteraction;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\wall.js":[function(require,module,exports){
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
},{}]},{},["C:\\Maze-Engine\\client\\app\\app.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvYXBwL2FwcC5qcyIsImNsaWVudC9hcHAvY29yZS9jZWxsLmpzIiwiY2xpZW50L2FwcC9jb3JlL2NvbmZpZy1tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL21hemUuanMiLCJjbGllbnQvYXBwL2NvcmUvdXNlci1pbnRlcmFjdGlvbi5qcyIsImNsaWVudC9hcHAvY29yZS93YWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbigpe1xyXG5cclxuXHRcInVzZSBzdHJpY3RcIjtcclxuXHJcblx0dmFyIG1haW4gPSBudWxsLFxyXG5cdFx0TWF6ZSA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS9tYXplXCIpLFxyXG5cdFx0Q29uZmlnID0gcmVxdWlyZShcIi4uL2FwcC9jb3JlL2NvbmZpZy1tYXplXCIpLFxyXG5cdFx0VXNlckludGVyYWN0aW9uID0gcmVxdWlyZShcIi4uL2FwcC9jb3JlL3VzZXItaW50ZXJhY3Rpb25cIiksXHJcblx0XHRpbnRlcmFjdGlvbiA9IG51bGw7XHJcblxyXG5cdGZ1bmN0aW9uIE1haW4oKXt9XHJcblxyXG5cdE1haW4ucHJvdG90eXBlID0ge1xyXG5cdFx0ZWRpdG9yIDogbnVsbCxcclxuXHRcdG1hemUgOiBudWxsLFxyXG5cdFx0Y2FudmFzIDogbnVsbCxcclxuXHRcdGNvbnRleHQgOiBudWxsLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKCl7XHJcblxyXG5cdFx0XHR0aGlzLmVkaXRvciA9IGFjZS5lZGl0KFwiZWRpdG9yXCIpO1xyXG5cdFx0ICAgIHRoaXMuZWRpdG9yLnNldFRoZW1lKFwiYWNlL3RoZW1lL21vbm9rYWlcIik7XHJcblx0XHQgICAgdGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIpO1xyXG5cclxuXHRcdFx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1haW4tY2FudmFzXCIpO1xyXG5cdFx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG5cdFx0XHR0aGlzLmNhbnZhcy53aWR0aCA9IENvbmZpZy5DRUxMX1NJWkUgKiBDb25maWcuV0lEVEg7XHJcblx0XHRcdHRoaXMuY2FudmFzLmhlaWdodCA9IENvbmZpZy5DRUxMX1NJWkUgKiBDb25maWcuSEVJR0hUO1xyXG5cclxuXHRcdFx0dGhpcy5mZXRjaE1hemVBbmREcmF3KCk7XHJcblxyXG5cdFx0XHR0aGlzLmJpbmRFdmVudHMoKTtcclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemVBbmREcmF3OmZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplKCkudGhlbihmdW5jdGlvbihjZWxscyl7XHJcblx0XHRcdFx0dGhpcy5tYXplID0gbmV3IE1hemUoe1xyXG5cdFx0XHRcdFx0Y2VsbHMgOiBjZWxsc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGludGVyYWN0aW9uID0gbmV3IFVzZXJJbnRlcmFjdGlvbih7XHJcblx0XHRcdFx0XHRjZWxsIDogY2VsbHNbMF1bMF1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLmRyYXcoKTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpKTtcclxuXHRcdH0sXHJcblx0XHRiaW5kRXZlbnRzIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGJ0bkRyYXdTb2x1dGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXQtZHJhdy1zb2x1dGlvblwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGJ0bkRyYXdTb2x1dGlvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLmhhbmRsZUNsaWNrRHJhd1NvbHV0aW9uLmJpbmQodGhpcyksZmFsc2UpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGJ0bk5ld01hemUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0LW5ldy1tYXplXCIpO1xyXG5cclxuXHRcdFx0YnRuTmV3TWF6ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLmhhbmRsZUNsaWNrTmV3TWF6ZS5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHJcblx0XHR9LFxyXG5cdFx0aGFuZGxlQ2xpY2tOZXdNYXplIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dGhpcy5tYXplLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0dGhpcy5mZXRjaE1hemVBbmREcmF3KCk7XHJcblx0XHR9LFxyXG5cdFx0aGFuZGxlQ2xpY2tEcmF3U29sdXRpb24gOiBmdW5jdGlvbigpe1xyXG5cclxuXHRcdFx0dmFyIGluaXRpYWxOb2RlID0gdGhpcy5tYXplLmNlbGxzWzBdWzBdO1xyXG5cdFx0XHR2YXIgY29kZVNvbHV0aW9uID0gdGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCk7XHJcblxyXG5cdFx0XHRpbnRlcmFjdGlvbi5pbml0KHtcclxuXHRcdFx0XHRjZWxscyA6IHRoaXMubWF6ZS5jZWxscyxcclxuXHRcdFx0XHRjZWxsIDoge1xyXG5cdFx0XHRcdFx0eCA6IGluaXRpYWxOb2RlLngsXHJcblx0XHRcdFx0XHR5IDogaW5pdGlhbE5vZGUueSxcclxuXHRcdFx0XHRcdHdpZHRoIDogaW5pdGlhbE5vZGUud2lkdGgsXHJcblx0XHRcdFx0XHRoZWlnaHQgOiBpbml0aWFsTm9kZS5oZWlnaHQsXHJcblx0XHRcdFx0XHR3YWxscyA6IHtcclxuXHRcdFx0XHRcdFx0cmlndGggOiBpbml0aWFsTm9kZS53YWxscy5yaWd0aCxcclxuXHRcdFx0XHRcdFx0bGVmdCA6IGluaXRpYWxOb2RlLndhbGxzLmxlZnQsXHJcblx0XHRcdFx0XHRcdHRvcCA6IGluaXRpYWxOb2RlLndhbGxzLnRvcCxcclxuXHRcdFx0XHRcdFx0Ym90dG9tIDogaW5pdGlhbE5vZGUud2FsbHMuYm90dG9tXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGludGVyYWN0aW9uLnJ1biA9IGV2YWwoY29kZVNvbHV0aW9uKTtcdFxyXG5cclxuXHRcdFx0aW50ZXJhY3Rpb24ucnVuKCk7XHJcblxyXG5cdFx0XHR2YXIgc29sdXRpb24gPSBpbnRlcmFjdGlvbi5tb3ZlcztcclxuXHJcblx0XHRcdGlmKHRoaXMubWF6ZS5hbmltYXRpb25JbnRlcnZhbCAmJiB0aGlzLm1hemUubWFpbkludGVydmFsKXtcclxuXHRcdFx0XHR0aGlzLm1hemUuc3RvcEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMubWF6ZS5jbGVhckNlbGwodGhpcy5jb250ZXh0LHRoaXMubWF6ZS5sYXN0Tm9kZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKHNvbHV0aW9uICYmIHNvbHV0aW9uLmxlbmd0aCl7XHJcblx0XHRcdFx0dGhpcy5tYXplLmRyYXdTb2x1dGlvbih0aGlzLmNvbnRleHQsc29sdXRpb24pO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCk7XHJcblx0XHRcdHRoaXMubWF6ZS5kcmF3KHRoaXMuY29udGV4dCk7XHJcblx0XHR9LFxyXG5cdFx0ZmV0Y2hNYXplIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIGZldGNoKFwiL2FwaS92MS9tYXplP3dpZHRoPVwiK0NvbmZpZy5XSURUSCtcIiZoZWlnaHQ9XCIrQ29uZmlnLkhFSUdIVCx7XHJcblx0XHRcdFx0bWV0aG9kOiAnR0VUJywgXHJcblx0XHRcdFx0aGVhZGVyczogbmV3IEhlYWRlcnMoe1xyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdGZldGNoTWF6ZVNvbHV0aW9uIDogZnVuY3Rpb24oZGF0YSl7XHJcblx0XHRcdHJldHVybiBmZXRjaChcIi9hcGkvdjEvbWF6ZS9zb2x1dGlvblwiLHtcclxuXHRcdFx0XHRtZXRob2Q6ICdQT1NUJywgXHJcblx0XHRcdFx0Ym9keSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxyXG5cdFx0XHRcdGhlYWRlcnM6IG5ldyBIZWFkZXJzKHtcclxuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblx0bWFpbiA9IG5ldyBNYWluKCk7XHJcblxyXG5cdHdpbmRvdy5vbmxvYWQgPSBtYWluLmluaXQuYmluZChtYWluKTtcclxuXHJcbn0oKSk7IiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcblx0dmFyIFdhbGwgPSByZXF1aXJlKFwiLi93YWxsXCIpLFxyXG5cdFx0Q29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnLW1hemVcIik7XHJcblxyXG5cdGZ1bmN0aW9uIENlbGwocmF3Q2VsbCl7XHJcblx0XHR0aGlzLndhbGxzID0ge1xyXG5cdFx0XHRsZWZ0IDogbnVsbCxcclxuXHRcdFx0cmlndGggOiBudWxsLFxyXG5cdFx0XHR0b3AgOiBudWxsLFxyXG5cdFx0XHRib3R0b20gOiBudWxsXHJcblx0XHR9O1xyXG5cdFx0dGhpcy5pbml0KHJhd0NlbGwpO1xyXG5cdH1cclxuXHJcblx0Q2VsbC5wcm90b3R5cGUgPSB7XHJcblx0XHRuYW1lcyA6IFtcImxlZnRcIixcInJpZ3RoXCIsXCJ0b3BcIixcImJvdHRvbVwiXSxcclxuXHRcdHggOiAwLFxyXG5cdFx0eSA6IDAsXHJcblx0XHR3aWR0aCA6IENvbmZpZy5DRUxMX1NJWkUsXHJcblx0XHRoZWlnaHQgOiBDb25maWcuQ0VMTF9TSVpFLFxyXG5cdFx0dmlzaXRlZCA6IGZhbHNlLFxyXG5cdFx0d2FsbHMgOiB7XHJcblx0XHRcdGxlZnQgOiBudWxsLFxyXG5cdFx0XHRyaWd0aCA6IG51bGwsXHJcblx0XHRcdHRvcCA6IG51bGwsXHJcblx0XHRcdGJvdHRvbSA6IG51bGxcclxuXHRcdH0sXHJcblx0XHRpbml0IDogZnVuY3Rpb24ocHJvcHMpe1xyXG5cdFx0XHR0aGlzLnggPSBwcm9wcy54O1xyXG5cdFx0XHR0aGlzLnkgPSBwcm9wcy55O1xyXG5cdFx0XHR0aGlzLndpZHRoID0gcHJvcHMud2lkdGg7XHJcblx0XHRcdHRoaXMuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xyXG5cdFx0XHR0aGlzLmNyZWF0ZVdhbGxzKHByb3BzLndhbGxzKTtcclxuXHRcdH0sXHJcblx0XHRjcmVhdGVXYWxscyA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0XHRmb3IodmFyIHAgaW4gcHJvcHMpe1xyXG5cdFx0XHRcdHZhciBvYmogPSBwcm9wc1twXTtcclxuXHRcdFx0XHRpZighb2JqKXtcclxuXHRcdFx0XHRcdHRoaXMud2FsbHNbcF0gPSBudWxsO1xyXG5cdFx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdFx0dGhpcy53YWxsc1twXSA9IG5ldyBXYWxsKHtcclxuXHRcdFx0XHRcdFx0bmFtZSA6IHAsXHJcblx0XHRcdFx0XHRcdHggOiBvYmoueCxcclxuXHRcdFx0XHRcdFx0eSA6IG9iai55LFxyXG5cdFx0XHRcdFx0XHRoZWlnaHQgOiBvYmouaGVpZ2h0LFxyXG5cdFx0XHRcdFx0XHR3aWR0aCA6IG9iai53aWR0aFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHR0aGlzLm5hbWVzLmZvckVhY2goZnVuY3Rpb24obmFtZSl7XHJcblx0XHRcdFx0dmFyIHdhbGwgPSB0aGlzLndhbGxzW25hbWVdO1xyXG5cdFx0XHRcdGlmKHdhbGwpe1xyXG5cdFx0XHRcdFx0d2FsbC5kcmF3KGNvbnRleHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSx0aGlzKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gQ2VsbDtcclxuXHJcbn0oKSk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Q0VMTF9TSVpFIDogMjAsXHJcblx0V0lEVEggOjIwLFxyXG5cdEhFSUdIVCA6IDIwXHJcbn07IiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcblx0dmFyIENlbGwgPSByZXF1aXJlKFwiLi9jZWxsXCIpO1xyXG5cclxuXHRmdW5jdGlvbiBNYXplKHByb3BzKXtcclxuXHRcdHRoaXMuaW5pdChwcm9wcyk7XHJcblx0fVxyXG5cclxuXHRNYXplLnByb3RvdHlwZSA9IHtcclxuXHRcdHdpZHRoIDogMCxcclxuXHRcdGhlaWdodCA6IDAsXHJcblx0XHRjZWxscyA6IFtdLFxyXG5cdFx0c29sdXRpb24gOiBbXSxcclxuXHRcdGFuaW1hdGlvbkludGVydmFsIDogbnVsbCxcclxuXHRcdG1haW5JbnRlcnZhbCA6IG51bGwsXHJcblx0XHRsYXN0Tm9kZSA6IG51bGwsXHJcblx0XHRpbml0IDogZnVuY3Rpb24ocHJvcHMpe1xyXG5cdFx0XHR0aGlzLndpZHRoID0gcHJvcHMuY2VsbHMubGVuZ3RoO1xyXG5cdFx0XHR0aGlzLmhlaWdodCA9IHByb3BzLmNlbGxzWzBdLmxlbmd0aDtcclxuXHRcdFx0dGhpcy5jcmVhdGVDZWxscyhwcm9wcy5jZWxscyk7XHJcblx0XHR9LFxyXG5cdFx0Y3JlYXRlQ2VsbHMgOiBmdW5jdGlvbihyYXdDZWxscyl7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmF3Q2VsbHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdCAgICAgICAgdGhpcy5jZWxsc1tpXSA9IFtdO1xyXG5cdFx0ICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJhd0NlbGxzW2ldLmxlbmd0aDsgaisrKSB7XHJcblx0XHQgICAgICAgICAgICB0aGlzLmNlbGxzW2ldW2pdID0gbmV3IENlbGwocmF3Q2VsbHNbaV1bal0pO1xyXG5cdFx0ICAgICAgICB9XHJcblx0XHQgICAgfVxyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LHRoaXMuY2VsbHNbMF1bMF0sIFwiYmx1ZVwiKTtcclxuXHRcdFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LHRoaXMuY2VsbHNbdGhpcy53aWR0aCAtIDFdW3RoaXMuaGVpZ2h0IC0gMV0sIFwicmVkXCIpO1xyXG5cclxuXHRcdFx0dGhpcy5jZWxscy5mb3JFYWNoKGZ1bmN0aW9uIChyb3dzKSB7XHJcblx0XHRcdFx0cm93cy5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpe1xyXG5cdFx0XHRcdFx0Y2VsbC5kcmF3KGNvbnRleHQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0XHRkcmF3U29sdXRpb24gOiBmdW5jdGlvbihjb250ZXh0LHNvbCl7XHJcblxyXG5cdFx0XHR0aGlzLnNvbHV0aW9uID0gc29sO1xyXG5cclxuXHRcdFx0dGhpcy5sYXN0Tm9kZSA9IHRoaXMuY2VsbHNbMF1bMF07XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0ZVBhdGguYmluZCh0aGlzLGNvbnRleHQpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgXHR0aGlzLmFuaW1hdGVQYXRoKGNvbnRleHQpO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcyksMjUwKTtcclxuXHJcblx0XHR9LFxyXG5cdFx0YW5pbWF0ZVBhdGg6ZnVuY3Rpb24oY29udGV4dCl7XHJcbiAgICAgICAgXHRcclxuXHRcdFx0aWYodGhpcy5zb2x1dGlvbi5sZW5ndGggPT09IDApe1xyXG5cdFx0XHRcdHRoaXMuY2xlYXJDZWxsKGNvbnRleHQsdGhpcy5sYXN0Tm9kZSk7XHJcblx0XHRcdFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LHRoaXMuY2VsbHNbMF1bMF0sIFwiYmx1ZVwiKTtcclxuICAgICAgICBcdFx0dGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHR0aGlzLmNsZWFyQ2VsbChjb250ZXh0LHRoaXMubGFzdE5vZGUpO1xyXG5cclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0dmFyIGNlbGwgPSB0aGlzLnNvbHV0aW9uLnNoaWZ0KCk7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdGlmKE1hdGguYWJzKGNlbGwueCAtIHRoaXMubGFzdE5vZGUueCkgPiAxIHx8XHJcbiAgICAgICAgXHRcdE1hdGguYWJzKGNlbGwueSAtIHRoaXMubGFzdE5vZGUueSkgPiAxKXtcclxuICAgICAgICBcdFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LHRoaXMuY2VsbHNbMF1bMF0sIFwiYmx1ZVwiKTtcclxuICAgICAgICBcdFx0dGhpcy5zdG9wQW5pbWF0aW9uKCk7XHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihjZWxsLnggPiB0aGlzLmxhc3ROb2RlLnggJiYgdGhpcy5sYXN0Tm9kZS53YWxscy5yaWd0aCl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0aWYoY2VsbC55IDwgdGhpcy5sYXN0Tm9kZS55ICYmIHRoaXMubGFzdE5vZGUud2FsbHMudG9wKXtcclxuICAgICAgICBcdFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LHRoaXMuY2VsbHNbMF1bMF0sIFwiYmx1ZVwiKTtcclxuICAgICAgICBcdFx0dGhpcy5zdG9wQW5pbWF0aW9uKClcclxuICAgICAgICBcdFx0cmV0dXJuO1xyXG4gICAgICAgIFx0fVxyXG5cclxuICAgICAgICBcdGlmKGNlbGwueSA+IHRoaXMubGFzdE5vZGUueSAmJiB0aGlzLmxhc3ROb2RlLndhbGxzLmJvdHRvbSl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0aWYoY2VsbC54IDwgdGhpcy5sYXN0Tm9kZS54ICYmIHRoaXMubGFzdE5vZGUud2FsbHMubGVmdCl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpXHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsY2VsbCwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHR0aGlzLmxhc3ROb2RlID0gY2VsbDtcclxuXHRcdH0sXHJcblx0XHRzdG9wQW5pbWF0aW9uIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRpb25JbnRlcnZhbCk7XHJcbiAgICAgICAgXHRjbGVhckludGVydmFsKHRoaXMubWFpbkludGVydmFsKTtcclxuICAgICAgICBcdHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwgPSBudWxsO1xyXG4gICAgICAgIFx0dGhpcy5tYWluSW50ZXJ2YWwgPSBudWxsO1xyXG5cdFx0fSxcclxuXHRcdGZpbGxDZWxsIDogZnVuY3Rpb24oY29udGV4dCxjZWxsLGNvbG9yKXtcclxuXHRcdFx0Y29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHRcdFx0dmFyIHggPSAoY2VsbC54ICogY2VsbC53aWR0aCkgKyA1O1xyXG5cdFx0XHR2YXIgeSA9IChjZWxsLnkgKiBjZWxsLmhlaWdodCkgKyA1O1xyXG5cdFx0XHRjb250ZXh0LmZpbGxSZWN0KHgseSxjZWxsLndpZHRoIC8gMixjZWxsLmhlaWdodCAvIDIpO1xyXG5cdFx0fSxcclxuXHRcdGNsZWFyQ2VsbCA6IGZ1bmN0aW9uKGNvbnRleHQsY2VsbCl7XHJcblx0XHRcdHZhciB4ID0gKGNlbGwueCAqIGNlbGwud2lkdGgpICsgNTtcclxuXHRcdFx0dmFyIHkgPSAoY2VsbC55ICogY2VsbC5oZWlnaHQpICsgNTtcclxuXHRcdFx0Y29udGV4dC5jbGVhclJlY3QoeCx5LGNlbGwud2lkdGggLyAyLGNlbGwuaGVpZ2h0IC8gMik7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIE1hemU7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdGZ1bmN0aW9uIFVzZXJJbnRlcmFjdGlvbihwcm9wcyl7XHJcblx0XHR0aGlzLmluaXQocHJvcHMpO1xyXG5cdH1cclxuXHJcblx0VXNlckludGVyYWN0aW9uLnByb3RvdHlwZSA9IHtcclxuXHRcdGNlbGxzIDogW10sXHJcblx0XHRjZWxsIDogbnVsbCxcclxuXHRcdHggOiAwLFxyXG5cdFx0eSA6IDAsXHJcblx0XHRtb3ZlcyA6IFtdLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dGhpcy5jZWxsID0gcHJvcHMuY2VsbDtcclxuXHRcdFx0dGhpcy5jZWxscyA9IHByb3BzLmNlbGxzO1xyXG5cdFx0XHR0aGlzLm1vdmVzID0gW107XHJcblx0XHRcdHRoaXMueCA9IDA7XHJcblx0XHRcdHRoaXMueSA9IDA7XHJcblx0XHR9LFxyXG5cdFx0aXNDb21wbGV0ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiSXMgQ29tcGxldGUgXCIgKyB0aGlzLmNlbGwueCArIFwiIFwiICsgdGhpcy5jZWxsLnkpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jZWxsLnggPT09IHRoaXMuY2VsbHMubGVuZ3RoIC0gMSAmJiB0aGlzLmNlbGwueSA9PT0gdGhpcy5jZWxsc1swXS5sZW5ndGggLSAxO1xyXG5cdFx0fSxcclxuXHRcdG1vdmVUbyA6IGZ1bmN0aW9uKGRpcmVjdGlvbil7XHJcblx0XHRcdGlmKCF0aGlzLmNhbk1vdmVUbyhkaXJlY3Rpb24pKXtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgbmV4dE1vdmUgPSB0aGlzLmdldE5leHRNb3ZlKGRpcmVjdGlvbik7XHJcblx0XHRcdHRoaXMubW92ZXMucHVzaChuZXh0TW92ZSk7XHJcblx0XHRcdHJldHVybiBuZXh0TW92ZTtcclxuXHRcdH0sXHJcblx0XHRjYW5Nb3ZlVG8gOiBmdW5jdGlvbihkaXJlY3Rpb24pe1xyXG5cdFx0XHR2YXIgbGFzdE1vdmUgPSB0aGlzLm1vdmVzW3RoaXMubW92ZXMubGVuZ3RoIC0gMV0gfHwgdGhpcy5nZXRTaW5nbGVNb3ZlKCk7XHJcblx0XHRcdHJldHVybiBsYXN0TW92ZS53YWxsc1tkaXJlY3Rpb25dID09PSBudWxsO1xyXG5cdFx0fSxcclxuXHRcdGdldE5leHRNb3ZlIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHJcblx0XHRcdHN3aXRjaChkaXJlY3Rpb24pe1xyXG5cdFx0XHRcdGNhc2UgJ2xlZnQnIDogXHJcblx0XHRcdFx0dGhpcy5jZWxsLngtPTE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAncmlndGgnIDogXHJcblx0XHRcdFx0dGhpcy5jZWxsLnggKz0gMTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdib3R0b20nIDogXHJcblx0XHRcdFx0dGhpcy5jZWxsLnkgKz0gMTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd0b3AnIDogXHJcblx0XHRcdFx0dGhpcy5jZWxsLnkgLT0gMTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0U2luZ2xlTW92ZSgpO1xyXG5cdFx0XHRcclxuXHRcdH0sXHJcblx0XHRnZXRTaW5nbGVNb3ZlIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGluaXRpYWxOb2RlID0gdGhpcy5jZWxsc1t0aGlzLmNlbGwueF1bdGhpcy5jZWxsLnldO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR4IDogaW5pdGlhbE5vZGUueCxcclxuXHRcdFx0XHR5IDogaW5pdGlhbE5vZGUueSxcclxuXHRcdFx0XHR3aWR0aCA6IGluaXRpYWxOb2RlLndpZHRoLFxyXG5cdFx0XHRcdGhlaWdodCA6IGluaXRpYWxOb2RlLmhlaWdodCxcclxuXHRcdFx0XHR3YWxscyA6IHtcclxuXHRcdFx0XHRcdHJpZ3RoIDogaW5pdGlhbE5vZGUud2FsbHMucmlndGgsXHJcblx0XHRcdFx0XHRsZWZ0IDogaW5pdGlhbE5vZGUud2FsbHMubGVmdCxcclxuXHRcdFx0XHRcdHRvcCA6IGluaXRpYWxOb2RlLndhbGxzLnRvcCxcclxuXHRcdFx0XHRcdGJvdHRvbSA6IGluaXRpYWxOb2RlLndhbGxzLmJvdHRvbVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRydW4gOiBmdW5jdGlvbigpe1xyXG5cdFx0XHQvL3RoaXMgbWV0aG9kIGNvdWxkIGJlIG92ZXJyaWRlZCBieSB1c2VyXHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cclxuXHRyZXR1cm4gVXNlckludGVyYWN0aW9uO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHRmdW5jdGlvbiBXYWxsKHByb3BzKXtcclxuXHRcdHRoaXMubmFtZSA9IHByb3BzLm5hbWU7XHJcblx0XHR0aGlzLmNvbG9yID0gcHJvcHMuY29sb3IgfHwgdGhpcy5jb2xvcjtcclxuXHRcdHRoaXMueCA9IHByb3BzLng7XHJcblx0XHR0aGlzLnkgPSBwcm9wcy55O1xyXG5cdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcblx0fVxyXG5cclxuXHRXYWxsLnByb3RvdHlwZSA9IHtcclxuXHRcdHggOiAwLFxyXG5cdFx0eSA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0d2lkdGggOiAwLFxyXG5cdFx0bmFtZSA6IFwiXCIsXHJcblx0XHRjb2xvciA6IFwiZ3JheVwiLFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHR0aGlzW3RoaXMubmFtZV0oY29udGV4dCk7XHJcblx0XHR9LFxyXG5cdFx0bGVmdDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLCh0aGlzLnkgKyAxKSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdH0sXHJcblx0XHRyaWd0aDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKCh0aGlzLnggKiB0aGlzLndpZHRoKSArIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbygodGhpcy54ICsgMSkgKiB0aGlzLndpZHRoLCAodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9LFxyXG5cdFx0dG9wIDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHRcclxuXHRcdH0sXHJcblx0XHRib3R0b20gOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsKHRoaXMueSAqIHRoaXMuaGVpZ2h0KSArIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCwodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIFdhbGw7XHJcblxyXG59KCkpOyJdfQ==
