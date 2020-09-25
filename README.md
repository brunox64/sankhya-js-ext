**sankhya-js extension**

Esta extensão consegue auxiliar na utilização dos componentes do sankhya-js, consegue também validar se as propriedades do **self** e **$scope** foram declaradas e também valida referência a funções e outras variáveis evitando que um erro de variável indefinida só seja pego em tempo de teste e não de desenvolvimento.

Ela funciona varrendo todos os arquivos de todas as pastas do workspace do Visual Studio Code e identificando declaração de diretivas AngularJs para depois auxiliar com o auto complete de tags html e atributos.

Se as definições de diretivas não estiverem disponíveis entre as pastas do workspace aberto pelo vscode, ela não será capaz de te auxiliar.

Atualmente só são varridas diretivas e html das mesmas. Declarações utilizando **.component** ainda não estão sendo suportadas.

Só são consideradas declarações explicitas de propriedades no **$scope** e **self** (ctrl) por exemplo:

    self.nomePropriedade;
    self.nomePropriedade = valorPropriedade;
    $scope.nomePropriedade;
    $scope.nomePropriedade = valorPropriedade;
