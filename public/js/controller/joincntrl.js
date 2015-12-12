'use strict';
/**
 * @ngdoc overview
 * @name collaborativeLearning
 * @description
 * # collaborativeLearning
 *
 * Main module of the application.
 */
angular.module('collaborativeLearning')
  .controller('joinController', function ($rootScope,$scope,$http,$state) {
  	
  		$http.get("/rooms").then(function(res){
  			console.log("rooms length",res.data.length);
        var len = res.data.length;
        var id = res.data[len-1]._id;
  			$scope.roomId = id;
  			$scope.join_room($scope.roomId);
  		});


  	



});