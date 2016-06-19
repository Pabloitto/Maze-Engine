(function() {

    "use strict";

    var http = require('http'),
        path = require('path'),
        express = require('express'),
        router = express(),
        bodyParser = require('body-parser'),
        server = http.createServer(router),
        MazeGenerator = require("./server/core/maze-generator");

    function init(){
		router.use(bodyParser.json({limit: '50mb'}));
		router.use(bodyParser.urlencoded({ limit: '50mb',extended: true }));
	    router.use(express.static(path.resolve(__dirname, 'client')));

        router.get('/api/v1/maze', function(request, response){  
            var width = request.query.width;
            var height = request.query.height;
            var mazeGenerator = new MazeGenerator({
                width : width,
                height : height
            });
            response.json(mazeGenerator.cells);
        });

        router.post('/api/v1/maze/solution',function(request,response){
            var body = request.body;
            var cells = body.cells;
            var mazeGenerator = new MazeGenerator({
                cells : cells
            });
            var solution = mazeGenerator.getSolutionPath(0,0,mazeGenerator.width - 1, mazeGenerator.height - 1);
            response.json(solution);
        });

	    startServer();
    }

   function startServer(){
        router.set('port', (process.env.PORT || 8081));
        router.listen(router.get('port'), function() {
          console.log('Node app is running on port', router.get('port'));
        });
   	}

    init();

}());