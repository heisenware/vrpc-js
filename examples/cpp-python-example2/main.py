from vrpc import VrpcLocal
import vrpc_bar  # Imports the extension


def _onEvent(event, *args):
    if event == 'empty':
        print(" - Oh no! The {} is empty!".format(args[0]))


def main():
    # Create an instance of a local (native-extension) vrpc factory
    vrpc = VrpcLocal(vrpc_bar)
    print("Why an example at the Bar?")
    print(" - Because {}".format(vrpc.call_static('Bar', 'philosophy')))

    # Create a Bar instance (using default constructor)
    bar = vrpc.create('Bar')

    print("Do you have rum")
    print(" - Yes" if bar.hasDrink('rum') else " - No")

    print("Well, then let's get a bottle out of the cellar.")
    bar.addBottle(
        'rum',
        {'brand': 'Don Papa', 'country': 'Philippines', 'age': 7}
    )

    print("Now, can I have a drink?")
    print(" - Yes" if bar.hasDrink('rum') else " - No")

    print("I would go for a \"Dark and Stormy\", please")
    msg = " - Here's your drink, took only {}s"
    bar.prepareDrink(lambda seconds: print(msg.format(seconds)))

    print("Nice! I take another one. Please tell me, once the rum is empty.")
    bar.onEmptyDrink((_onEvent, 'empty'))
    bar.prepareDrink(lambda seconds: print(msg.format(seconds) + " this time"))
    bar.removeBottle('rum')

    # Create another bar - already equipped - using second constructor
    neighborsBar = vrpc.create(
        'Bar',
        {
            'rum': [
                {'brand': 'Botucal', 'country': 'Venezula', 'age': 8},
                {'brand': 'Plantation XO', 'country': 'Barbados', 'age': 20}
            ],
            'brandy': [
                {'brand': 'Lustau Solera', 'country': 'Spain', 'age': 15}
            ]
        }
    )
    print("How is your neighbor sorted?")
    print(" - Very well:\n{}".format(neighborsBar.getAssortment()))


if __name__ == '__main__':
    main()
