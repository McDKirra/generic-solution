import * as React from 'react';

import { CompoundButton, Stack, IStackTokens, elementContains, initializeIcons } from 'office-ui-fabric-react';
import { SearchBox } from 'office-ui-fabric-react/lib/SearchBox';
import { Pivot, PivotItem, IPivotItemProps} from 'office-ui-fabric-react/lib/Pivot';

import { sp } from "@pnp/sp";
import { Web, Lists } from "@pnp/sp/presets/all"; //const projectWeb = Web(useProjectWeb);

import { IWebAddResult, IWebInfo, IWeb, } from "@pnp/sp/webs/types";

import "@pnp/sp/webs";

import { IContentsListInfo, IMyListInfo, IServiceLog, IContentsLists } from '../../../../services/listServices/listTypes'; //Import view arrays for Time list

import { doesObjectExistInArray, addItemToArrayIfItDoesNotExist } from '../../../../services/arrayServices';

import { ITheTime } from '../../../../services/dateServices';

import {  } from '../Contents/contentsComponent';

import styles from '../Contents/contents.module.scss';

import ButtonCompound from '../createButtons/ICreateButtons';
import { IButtonProps, ISingleButtonProps, IButtonState } from "../createButtons/ICreateButtons";

import { createAdvancedContentChoices } from '../fields/choiceFieldBuilder';

import { IContentsToggles, makeToggles } from '../fields/toggleFieldBuilder';

import { IPickedList, IPickedWebBasic, IMyPivots, IPivot,  ILink, IUser, IMyProgress, IMyIcons, IMyFonts, IChartSeries, ICharNote, IRefinerRules, RefineRuleValues } from '../IReUsableInterfaces';

import { createLink } from '../HelpInfo/AllLinks';

import { IRefiners, IRefinerLayer, IItemRefiners } from '../IReUsableInterfaces';

import { PageContext } from '@microsoft/sp-page-context';

import { pivotOptionsGroup, } from '../../../../services/propPane';

import * as links from '../HelpInfo/AllLinks';

import { getHelpfullError, } from '../../../../services/ErrorHandler';
import { getRandomInt } from '../ListProvisioning/ListsTMT/ItemsWebPart';

import MyDrillItems from './drillListView';

import { getAllItems } from './drillFunctions';

export interface IDrillWeb extends Partial<IPickedWebBasic> {
    title?: string;
    ServerRelativeUrl?: string;
    guid?: string;
    url: string;
    siteIcon?: string;
  }


  export interface IDrillList extends Partial<IPickedList> {
    title: string;
    name?: string;
    guid?: string;
    isLibrary?: boolean;
    webURL?: string;
    refiners: string[]; //String of Keys representing the static name of the column used for drill downs
    emptyRefiner: string;
    refinerRules: IRefinerRules[][]; 
  }

export interface IMyPivCat {
    title: string;
    desc: string;
    order: number;
}

export const pivCats = {
    all: {title: 'All', desc: '', order: 1},
    newWebs: {title: 'New' , desc: '', order: 1},
    recCreate:  {title: 'RecentlyCreated' , desc: '', order: 1},
    oldCreate: {title: 'Old', desc: '', order: 9 },
    recUpdate: {title: 'RecentlyUpdated', desc: '', order: 9 },
    oldUpdate: {title: 'Stale', desc: '', order: 9 },
};


export interface IDrillItemInfo extends Partial<any>{

    sort: string;
    searchString: string;
    meta: string[];

    Created: any;
    Modified: any;
    Author: any;
    Editor: any;
    timeCreated : ITheTime;

    timeModified : ITheTime;
    bestCreate: string;
    bestMod: string;

    author: IUser;
    editor: IUser;

    refiners: IItemRefiners; //String of Keys representing the static name of the column used for drill downs

}


export interface IDrillDownProps {
    // 0 - Context
    
    pageContext: PageContext;

    allowOtherSites?: boolean; //default is local only.  Set to false to allow provisioning parts on other sites.

    allowRailsOff?: boolean;
    allowSettings?: boolean;

    webURL?: string;
    
    listName : string;
    
    allLoaded: boolean;

    currentUser: IUser;

    parentListFieldTitles: string;

    showPane: boolean;
    // 2 - Source and destination list information

    WebpartHeight: number;
    WebpartWidth: number;

    refiners: string[]; //String of Keys representing the static name of the column used for drill downs

    /**    
     * 'parseBySemiColons' |
     * 'groupBy10s' |  'groupBy100s' |  'groupBy1000s' |  'groupByMillions' |
     * 'groupByDays' |  'groupByMonths' |  'groupByYears' |
     * 'groupByUsers' | 
     * 
     * rules string formatted as JSON : [ string[] ]  =  [['parseBySemiColons''groupByMonths'],['groupByMonths'],['groupByUsers']]
     * [ ['parseBySemiColons''groupByMonths'],
     * ['groupByMonths'],
     * ['groupByUsers'] ]
     * 
    */

    rules: string;

}

export interface IDrillDownState {

    allowOtherSites?: boolean; //default is local only.  Set to false to allow provisioning parts on other sites.

    webURL?: string;

    allLoaded: boolean;

    currentPage: string;
    searchCount: number;

    searchText: string;
    searchMeta: string[];

    searchedItems: IDrillItemInfo[];
    first20searchedItems: IDrillItemInfo[];

    progress: IMyProgress;

    allItems: IDrillItemInfo[];

    meta: string[];

    errMessage: string | JSX.Element;

    drillList: IDrillList;

    WebpartHeight: number;
    WebpartWidth: number;

    refinerObj: IRefiners;

    pivotCats: IMyPivCat[];

    
}

export default class DrillDown extends React.Component<IDrillDownProps, IDrillDownState> {

/***
 *          .o88b.  .d88b.  d8b   db .d8888. d888888b d8888b. db    db  .o88b. d888888b  .d88b.  d8888b. 
 *         d8P  Y8 .8P  Y8. 888o  88 88'  YP `~~88~~' 88  `8D 88    88 d8P  Y8 `~~88~~' .8P  Y8. 88  `8D 
 *         8P      88    88 88V8o 88 `8bo.      88    88oobY' 88    88 8P         88    88    88 88oobY' 
 *         8b      88    88 88 V8o88   `Y8b.    88    88`8b   88    88 8b         88    88    88 88`8b   
 *         Y8b  d8 `8b  d8' 88  V888 db   8D    88    88 `88. 88b  d88 Y8b  d8    88    `8b  d8' 88 `88. 
 *          `Y88P'  `Y88P'  VP   V8P `8888Y'    YP    88   YD ~Y8888P'  `Y88P'    YP     `Y88P'  88   YD 
 *                                                                                                       
 *                                                                                                       
 */

    private createEmptyRefinerRules( rules: string ) {
        let emptyRules : any = null;
        try {
            emptyRules = JSON.parse(rules);
        } catch(e) {
            emptyRules = undefined;
        }

        return emptyRules;
    }

    private createDrillList(webURL: string, name: string, isLibrary: boolean, refiners: string[], rules: string, title: string = null) {

        let list: IDrillList = {
            title: title,
            name: name,
            guid: '',
            isLibrary: isLibrary,
            webURL: webURL,
            refiners: refiners,
            emptyRefiner: 'Unknown',
            refinerRules: this.createEmptyRefinerRules( rules ),
            
        };

        return list;
    }

    public constructor(props:IDrillDownProps){
        super(props);

        let drillList = this.createDrillList(this.props.webURL, this.props.listName, false, this.props.refiners, this.props.rules, '');
        let errMessage = drillList.refinerRules === undefined ? 'Invalid Rule set: ' +  this.props.rules : '';
        if ( drillList.refinerRules === undefined ) { drillList.refinerRules = [[],[],[]] ; } 

        this.state = { 

            //Size courtesy of https://www.netwoven.com/2018/11/13/resizing-of-spfx-react-web-parts-in-different-scenarios/
            WebpartHeight: this.props.WebpartHeight ,
            WebpartWidth:  this.props.WebpartWidth ,

            drillList: drillList,

            allowOtherSites: this.props.allowOtherSites === true ? true : false,
            currentPage: 'Click Button to start',
            allLoaded: false,

            allItems: [],
            searchedItems: [],
            first20searchedItems: [],
            searchCount: 0,

            meta: [],

            webURL: this.props.webURL,

            searchMeta: [pivCats.all.title],
            searchText: '',

            errMessage: errMessage,

            progress: null,

            refinerObj: {childrenKeys: this.props.refiners, childrenObjs: [] , multiCount: 0, itemCount: 0 },

            pivotCats: [],

        };

    // because our event handler needs access to the component, bind 
    //  the component to the function so it can get access to the
    //  components properties (this.props)... otherwise "this" is undefined
    // this.onLinkClick = this.onLinkClick.bind(this);

    }

  public componentDidMount() {
    this._updateStateOnPropsChange();
    console.log('Mounted!');
  }


  /***
 *         d8888b. d888888b d8888b.      db    db d8888b. d8888b.  .d8b.  d888888b d88888b 
 *         88  `8D   `88'   88  `8D      88    88 88  `8D 88  `8D d8' `8b `~~88~~' 88'     
 *         88   88    88    88   88      88    88 88oodD' 88   88 88ooo88    88    88ooooo 
 *         88   88    88    88   88      88    88 88~~~   88   88 88~~~88    88    88~~~~~ 
 *         88  .8D   .88.   88  .8D      88b  d88 88      88  .8D 88   88    88    88.     
 *         Y8888D' Y888888P Y8888D'      ~Y8888P' 88      Y8888D' YP   YP    YP    Y88888P 
 *                                                                                         
 *                                                                                         
 */

  public componentDidUpdate(prevProps){

    if ( prevProps.webURL != this.props.webURL || prevProps.listName != this.props.listName ) {
        this._updateStateOnPropsChange();
    }

  }

/***
 *         d8888b. d88888b d8b   db d8888b. d88888b d8888b. 
 *         88  `8D 88'     888o  88 88  `8D 88'     88  `8D 
 *         88oobY' 88ooooo 88V8o 88 88   88 88ooooo 88oobY' 
 *         88`8b   88~~~~~ 88 V8o88 88   88 88~~~~~ 88`8b   
 *         88 `88. 88.     88  V888 88  .8D 88.     88 `88. 
 *         88   YD Y88888P VP   V8P Y8888D' Y88888P 88   YD 
 *                                                          
 *                                                          
 */

    public render(): React.ReactElement<IDrillDownProps> {


        let x = 1;
        if ( x === 1 ) {

/***
 *              d888888b db   db d888888b .d8888.      d8888b.  .d8b.   d888b  d88888b 
 *              `~~88~~' 88   88   `88'   88'  YP      88  `8D d8' `8b 88' Y8b 88'     
 *                 88    88ooo88    88    `8bo.        88oodD' 88ooo88 88      88ooooo 
 *                 88    88~~~88    88      `Y8b.      88~~~   88~~~88 88  ooo 88~~~~~ 
 *                 88    88   88   .88.   db   8D      88      88   88 88. ~8~ 88.     
 *                 YP    YP   YP Y888888P `8888Y'      88      YP   YP  Y888P  Y88888P 
 *                                                                                     
 *                                                                                     
 */

            console.log('renderStateWebs', this.state.allItems );

            let thisPage = null;

            let errMessage = this.state.errMessage === '' ? null : <div>
                { this.state.errMessage }
            </div>;

            /*https://developer.microsoft.com/en-us/fabric#/controls/web/searchbox*/
            let searchBox =  
            <div className={[styles.searchContainer, styles.padLeft20 ].join(' ')} >
              <SearchBox
                className={styles.searchBox}
                styles={{ root: { maxWidth: this.props.allowRailsOff === true ? 200 : 300 } }}
                placeholder="Search"
                onSearch={ this._searchForText.bind(this) }
                onFocus={ () => console.log('this.state',  this.state) }
                onBlur={ () => console.log('onBlur called') }
                onChange={ this._searchForText.bind(this) }
              />
              <div className={styles.searchStatus}>
                { 'Searching ' + this.state.searchCount + ' items' }
                { /* 'Searching ' + (this.state.searchType !== 'all' ? this.state.filteredTiles.length : ' all' ) + ' items' */ }
              </div>
            </div>;

            const stackPageTokens: IStackTokens = { childrenGap: 10 };

            let toggles = <div style={{ float: 'right' }}> { makeToggles(this.getPageToggles()) } </div>;

            let drillPivots0 = this.createPivotObject(this.state.searchMeta[0], '', 0);

            let noInfo = [];
            noInfo.push( <h3>{'Found ' + this.state.searchCount + ' items with this search criteria:'}</h3> )  ;
            if ( this.state.searchText != '' ) { noInfo.push( <p>{'Search Text: ' + this.state.searchText}</p> )  ; }
            if ( this.state.searchMeta[0] != '' ) { noInfo.push( <p>{'Refiner: ' + this.state.searchMeta[0]}</p> ) ; }


            if ( this.state.allItems.length === 0 ) {
                thisPage = <div style={{ paddingBottom: 30 }}className={styles.contents}>
                { errMessage }</div>;
            } else {

                
                let drillItems = this.state.searchedItems.length === 0 ? <div>NO ITEMS FOUND</div> : <div>
                    <MyDrillItems 
                        items={ this.state.searchedItems }
                    ></MyDrillItems>
                    </div>;

                thisPage = <div className={styles.contents}><div>

                <div className={ this.state.errMessage === '' ? styles.hideMe : styles.showErrorMessage  }>{ this.state.errMessage } </div>
                <p><mark>Pick up by looking at the searchMeta[] array in search.</mark>  It's currently thinking the array is just a string.  line 542 - getNewFilteredItems()</p>
                <Stack horizontal={true} wrap={true} horizontalAlign={"space-between"} verticalAlign= {"center"} tokens={stackPageTokens}>{/* Stack for Buttons and Webs */}
                     { searchBox } { toggles }
                </Stack>

                <div style={{ height:30, paddingBottom: 15} }> { drillPivots0 } </div>

                <div>

                <div className={ this.state.searchCount !== 0 ? styles.hideMe : styles.showErrorMessage  }>{ noInfo } </div>

                <Stack horizontal={false} wrap={true} horizontalAlign={"stretch"} tokens={stackPageTokens}>{/* Stack for Buttons and Webs */}
                    { drillItems  }
                </Stack>
                </div></div></div>;

                if ( this.state.allItems.length === 0 ) {
                    thisPage = <div style={{ paddingBottom: 30 }}className={styles.contents}>
                    { errMessage }</div>;
                }
            }


/***
 *              d8888b. d88888b d888888b db    db d8888b. d8b   db 
 *              88  `8D 88'     `~~88~~' 88    88 88  `8D 888o  88 
 *              88oobY' 88ooooo    88    88    88 88oobY' 88V8o 88 
 *              88`8b   88~~~~~    88    88    88 88`8b   88 V8o88 
 *              88 `88. 88.        88    88b  d88 88 `88. 88  V888 
 *              88   YD Y88888P    YP    ~Y8888P' 88   YD VP   V8P 
 *                                                                 
 *                                                                 
 */

            return (
                <div className={ styles.contents }>
                <div className={ styles.container }>
                <div className={ styles.rightPivot }>
                        { thisPage }
                </div></div></div>
            );
            
        } else {
            console.log('DrillDown.tsx return null');
            return (  <div className={ styles.contents }>
                <h2>There is nothing to see</h2>
            </div> );
        }

    }   //End Public Render


    private getAllItems() {
        let listGuid = '';

        let result : any = getAllItems( this.state.drillList, this.addTheseItemsToState.bind(this), this.setProgress.bind(this), null );

    }

    private addTheseItemsToState( allItems , errMessage : string, refinerObj: IRefiners ) {

        let newFilteredItems : IDrillItemInfo[] = this.getNewFilteredItems( '', this.state.searchMeta, allItems );
        let pivotCats : any = refinerObj.childrenKeys.map( r => { return this.createThisPivotCat(r,'',0); });

        this.setState({
            allItems: allItems,
            searchedItems: newFilteredItems,
            searchCount: newFilteredItems.length,
            errMessage: errMessage,
            searchText: '',
            searchMeta: this.state.searchMeta,
            refinerObj: refinerObj,
            pivotCats: pivotCats,
        });
        return true;
    }

    private createThisPivotCat ( title, desc, order ) {

        let pivCat : IMyPivCat = {
            title: title,
            desc: desc,
            order: order,
        };

        return pivCat;

    }

/***
 *         .d8888. d88888b  .d8b.  d8888b.  .o88b. db   db 
 *         88'  YP 88'     d8' `8b 88  `8D d8P  Y8 88   88 
 *         `8bo.   88ooooo 88ooo88 88oobY' 8P      88ooo88 
 *           `Y8b. 88~~~~~ 88~~~88 88`8b   8b      88~~~88 
 *         db   8D 88.     88   88 88 `88. Y8b  d8 88   88 
 *         `8888Y' Y88888P YP   YP 88   YD  `Y88P' YP   YP 
 *                                                         
 *                                                         
 */

  public _onSearchForMeta = (item): void => {
    //This sends back the correct pivot category which matches the category on the tile.
    let e: any = event;
    console.log('searchForItems: e',e);
    console.log('searchForItems: item', item);
    console.log('searchForItems: this', this);

    //Be sure to pass item.props.itemKey to get filter value
    this.searchForItems( this.state.searchText, [item.props.itemKey], false );
  }

  public _searchForText = (item): void => {
    //This sends back the correct pivot category which matches the category on the tile.
    let e: any = event;
    console.log('searchForItems: e',e);
    console.log('searchForItems: item', item);
    console.log('searchForItems: this', this);

    this.searchForItems( item, this.state.searchMeta, true );
  }


  public searchForItems = (text: string, meta: string[] , resetSpecialAlt: boolean ): void => {

    let searchItems : IDrillItemInfo[] = this.state.allItems;
    let searchCount = searchItems.length;

    let newFilteredItems : IDrillItemInfo[] = this.getNewFilteredItems( text, meta, searchItems );

    console.log('Searched for:' + text);
    console.log('Web Meta:' + meta);
    console.log('and found these items:', newFilteredItems);
    searchCount = newFilteredItems.length;

    this.setState({
      searchedItems: newFilteredItems,
      searchCount: searchCount,
      searchText: text.toLowerCase(),
      searchMeta: meta,
    });


    return ;
    
  } //End searchForItems

    
  private getNewFilteredItems(text: string, meta: string[] , searchItems : IDrillItemInfo[] ) {

    let newFilteredItems : IDrillItemInfo[] = [];

    for (let thisSearchItem of searchItems) {

        let searchString = thisSearchItem.searchString;

        if ( meta !== undefined && meta !== null && meta.length > 0 ) {
            for ( let m in meta ) {
                let itemMeta = thisSearchItem.refiners['lev' + m];
                if ( meta[m] == 'All' || meta[m] == '' || itemMeta.indexOf(meta[m]) > -1 ) {
                    if( searchString.indexOf(text.toLowerCase()) > -1 ) {
                        newFilteredItems.push(thisSearchItem);
                    }
                }
            }
        }
      }

      return newFilteredItems;

  }

     /**
    * 
    * @param progressHidden 
    * @param page : page you want to add this to 'E' | 'C' | 'V' | 'I'
    * @param current : current index of progress
    * @param ofThese : total count of items in progress
    * @param color : color of label like red, yellow, green, null
    * @param icon : Fabric Icon name if desired
    * @param logLabel : short label of item used for displaying in page
    * @param label : longer label used in Progress Indicator and hover card
    * @param description 
    */
   private setProgress(progressHidden: boolean, page: 'E' | 'C' | 'V' | 'I', current: number , ofThese: number, color: string, icon: string, logLabel: string, label: string, description: string, ref: string = null ){
    let thisTime = new Date().toLocaleTimeString();
    const percentComplete = ofThese !== 0 ? current/ofThese : 0;

    logLabel = current > 0 ? current + '/' + ofThese + ' - ' + logLabel : logLabel ;
    let progress: IMyProgress = {
        ref: ref,
        time: thisTime,
        logLabel: logLabel,
        label: label + '- at ' + thisTime,
        description: description,
        percentComplete: percentComplete,
        progressHidden: progressHidden,
        color: color,
        icon: icon,
      };

    //console.log('setting Progress:', progress);

    this.setState({
        progress: progress,
    });

  }
  
/***
 *         db    db d8888b. d8888b.  .d8b.  d888888b d88888b      .d8888. d888888b  .d8b.  d888888b d88888b 
 *         88    88 88  `8D 88  `8D d8' `8b `~~88~~' 88'          88'  YP `~~88~~' d8' `8b `~~88~~' 88'     
 *         88    88 88oodD' 88   88 88ooo88    88    88ooooo      `8bo.      88    88ooo88    88    88ooooo 
 *         88    88 88~~~   88   88 88~~~88    88    88~~~~~        `Y8b.    88    88~~~88    88    88~~~~~ 
 *         88b  d88 88      88  .8D 88   88    88    88.          db   8D    88    88   88    88    88.     
 *         ~Y8888P' 88      Y8888D' YP   YP    YP    Y88888P      `8888Y'    YP    YP   YP    YP    Y88888P 
 *                                                                                                          
 *                                                                                                          
 */

    private _updateStateOnPropsChange(): void {
        this.getAllItems();
    }

    /***
 *         d8888b. d888888b db    db  .d88b.  d888888b .d8888. 
 *         88  `8D   `88'   88    88 .8P  Y8. `~~88~~' 88'  YP 
 *         88oodD'    88    Y8    8P 88    88    88    `8bo.   
 *         88~~~      88    `8b  d8' 88    88    88      `Y8b. 
 *         88        .88.    `8bd8'  `8b  d8'    88    db   8D 
 *         88      Y888888P    YP     `Y88P'     YP    `8888Y' 
 *                                                             
 *                                                             
 */


    public createPivotObject(setPivot, display, layer){

        let theseStyles = null;
    
        let pivotWeb = 
        <Pivot 
          style={{ flexGrow: 1, paddingLeft: '10px', display: display }}
          styles={ theseStyles }
          linkSize= { pivotOptionsGroup.getPivSize('normal') }
          linkFormat= { pivotOptionsGroup.getPivFormat('links') }
          onLinkClick= { this._onSearchForMeta.bind(this) }  //{this.specialClick.bind(this)}
          selectedKey={ setPivot }
          headersOnly={true}>
            {this.getRefinerPivots(layer)}
        </Pivot>;
        return pivotWeb;
      }

      private getRefinerPivots(layer) {

        let thesePivots = [ ];
        if ( this.state.pivotCats.length === 0 ) {
            thesePivots = [this.buildFilterPivot( pivCats.all )];
        } else  {
            thesePivots = [this.buildFilterPivot( pivCats.all )];

            thesePivots = thesePivots.concat(this.state.pivotCats.map( pC => { return this.buildFilterPivot( pC ) ; }) ) ;
        }

        return thesePivots;

      }
    private getWebPivots() {

        let all = this.buildFilterPivot( pivCats.all );
        let newWebs = this.buildFilterPivot(pivCats.newWebs);

        let recCreate = this.buildFilterPivot(pivCats.recCreate);
        let oldCreate = this.buildFilterPivot(pivCats.oldCreate);
        let recUpdate = this.buildFilterPivot(pivCats.recUpdate);
        let oldUpdate = this.buildFilterPivot(pivCats.oldUpdate);

        
        let thesePivots = [all, newWebs, recCreate, oldCreate, recUpdate, oldUpdate ];

        return thesePivots;
    }

    private buildFilterPivot(pivCat: IMyPivCat) {

        if ( pivCat === undefined || pivCat === null ) {
            let p = <PivotItem 
                headerText={ 'ErrPivCat' }
                itemKey={ 'ErrPivCat' }
                >
                { 'ErrPivCat' }
            </PivotItem>;

        } else {
        let p = <PivotItem 
            headerText={ pivCat.title }
            itemKey={ pivCat.title }
            >
            { pivCat.desc }
        </PivotItem>;

        return p;
        }

    }

/***
 *         d888888b  .d88b.   d888b   d888b  db      d88888b .d8888. 
 *         `~~88~~' .8P  Y8. 88' Y8b 88' Y8b 88      88'     88'  YP 
 *            88    88    88 88      88      88      88ooooo `8bo.   
 *            88    88    88 88  ooo 88  ooo 88      88~~~~~   `Y8b. 
 *            88    `8b  d8' 88. ~8~ 88. ~8~ 88booo. 88.     db   8D 
 *            YP     `Y88P'   Y888P   Y888P  Y88888P Y88888P `8888Y' 
 *                                                                   
 *                                                                   
 */

    private getPageToggles() {

        let togDesc = {
            //label: <span style={{ color: 'red', fontWeight: 900}}>Rails Off!</span>,
            label: <span>Description</span>,
            key: 'togggleDescription',
            _onChange: this.updateTogggleDesc.bind(this),
            checked: false,
            onText: '-',
            offText: '-',
            className: '',
            styles: '',
        };

        let togDates = {
            //label: <span style={{ color: 'red', fontWeight: 900}}>Rails Off!</span>,
            label: <span>Dates</span>,
            key: 'togggleDates',
            _onChange: this.updateTogggleDates.bind(this),
            checked: false,
            onText: 'Actual',
            offText: 'Friendly',
            className: '',
            styles: '',
        };

        let theseToggles = [togDesc , togDates];

        let pageToggles : IContentsToggles = {
            toggles: theseToggles,
            childGap: this.props.allowRailsOff === true ? 30 : 30,
            vertical: false,
            hAlign: 'end',
            vAlign: 'start',
            rootStyle: { width: this.props.allowRailsOff === true ? 120 : 120 , paddingTop: 0, paddingRight: 0, }, //This defines the styles on each toggle
        };

        return pageToggles;

    }

    private updateTogggleDesc() {
        this.setState({
            
        });
    }

    private updateTogggleDates() {
        this.setState({
            
        });
    }

}