'use strict';
/**
 * @ngdoc overview
 * @name collaborativeLearning
 * @description
 * # collaborativeLearning
 *
 * Main module of the application.
 */
angular.module('collaborativeLearning', ['ui.router'])
.config(['$locationProvider', '$stateProvider', '$urlRouterProvider',
      function($locationProvider,$stateProvider, $urlRouterProvider) {
            $locationProvider.html5Mode(false);

            $urlRouterProvider
                .otherwise("/home");

    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: 'views/home.html'
        })
      .state('create', {
        url: '/create/',
        templateUrl: 'views/create.html',
        controller:"roomController",
        resolve: {
          create:function(){         
          }
        }     
      })
      .state('join', {
        url: '/join/',
        templateUrl: 'views/join.html',
         controller:"joinController",
        resolve: {
        }     
      })
      .state('selectquestion', {
        url: '/selectquestion/:name/',
        templateUrl: 'views/selectquestion.html',
         controller:"selectQuestion",
        resolve: {
        }     
      })
     .state('questionanswer', {
        url: '/questionanswer/:name',
        templateUrl: 'views/questionanswer.html',
        controller: 'questionanswercntrl',
        resolve: {
          data:function(){
            console.log("the appp");
          }
        }     
      })
     .state('report', {
        url: '/report',
        templateUrl: 'views/report.html',
        controller:'reportcntrl',
        resolve: {
          data:function(){
            console.log("the appp");
          }
        }     
      })

  }]);
  
