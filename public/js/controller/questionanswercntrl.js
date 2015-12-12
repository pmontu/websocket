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
  .controller('questionanswercntrl', function ($rootScope,$scope,$http,$state,$stateParams) {
  	 	
 	var player = $state.params.name;
 	$scope.player = player;
		
});



