(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze"),
		UserInteraction = require("../app/core/user-interaction"),
		MouseEventListener = require("../app/core/mouse-event-listener"),
		interaction = null,
		mouseX = 0,
		mouseY = 0;

	function Main(){}

	Main.prototype = {
		editor : null,
		maze : null,
		canvas : null,
		context : null,
		init : function(){
			this.getInitialSize();
			this.initEditor();
			this.canvas = document.querySelector(".main-canvas");
			this.context = this.canvas.getContext("2d");

			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;

			this.fetchMazeAndDraw().then(function(){
				this.update();
			}.bind(this));

			this.bindEvents();
		},
		getInitialSize : function(){
			Config.WIDTH = Math.floor(10 + (Math.random() * 20));
			Config.HEIGHT = Config.WIDTH;
		},
		update : function(){
			this.draw();
			requestAnimationFrame(this.update.bind(this));
		},
		fetchMazeAndDraw:function(){
			return this.fetchMaze().then(function(cells){
				this.maze = new Maze({
					width : Config.WIDTH,
					height : Config.HEIGHT,
					cells : cells
				});
				interaction = new UserInteraction({
					end : this.maze.getEndNode(),
					cell : cells[0][0]
				});
			}.bind(this));
		},
		bindEvents : function(){
			var btnDrawSolution = document.getElementById("input-draw-solution"),
				btnNewMaze = document.getElementById("input-new-maze");
			
			btnDrawSolution.addEventListener("click",this.handleClickDrawSolution.bind(this),false);
			btnNewMaze.addEventListener("click",this.handleClickNewMaze.bind(this),false);

			this.editor.on("change", function(){
				var code = this.editor.getSession().getValue();
				localStorage.setItem("code",code);
			}.bind(this));
		},
		handleClickNewMaze : function(){
			this.getInitialSize();
			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;
			this.maze.width = Config.width;
			this.maze.height = Config.height;
			this.fetchMazeAndDraw();
		},
		handleClickDrawSolution : function(){
			var codeSolution = this.editor.getSession().getValue();
			var run = eval(codeSolution);
			
			this.initInteraction();	
			interaction.execute(run.bind(interaction));
		},
		initEditor : function(){
			var code = localStorage.getItem("code");

			this.editor = ace.edit("editor");
		    this.editor.setTheme("ace/theme/monokai");
		    this.editor.getSession().setMode("ace/mode/javascript");

		    if(code){
				this.editor.getSession().setValue(code, 1);
			}
		},
		initInteraction : function(){
			var initialNode = this.maze.cells[0][0];
			interaction.init({
				end : this.maze.getEndNode(),
				cells : this.maze.cells,
				cell : {
					x : initialNode.x,
					y : initialNode.y,
					width : initialNode.width,
					height : initialNode.height,
					walls : {
						right : initialNode.walls.right,
						left : initialNode.walls.left,
						top : initialNode.walls.top,
						bottom : initialNode.walls.bottom
					}
				}
			});
		},
		draw : function(){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			this.maze.draw(this.context);
			var toPaint = interaction.getToPaint();
			if(toPaint.length > 0){
				var index = toPaint.length - 2;
				var currentNode = index < 0 ? this.maze.cells[0][0] : toPaint[index];
				var nextNode = toPaint[toPaint.length - 1];
				if(!this.maze.isInvalidMove(currentNode,nextNode)){
					this.maze.fillCell(this.context,nextNode, "blue");
				}else {
					this.initInteraction();
				}
			}else{
				this.maze.fillCell(this.context,this.maze.cells[0][0], "blue");
			}
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